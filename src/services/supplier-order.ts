import {
	buildQuery,
	Cart,
	FindConfig,
	LineItemService,
	OrderService,
	RegionService,
	TransactionBaseService,
} from '@medusajs/medusa';
import { isDefined, MedusaError } from '@medusajs/utils';
import { SupplierOrder } from 'src/models/supplier-order';
import SupplierOrderRepository from 'src/repositories/supplier-order';
import {
	CreateSupplierOrderInput,
	SupplierOrderSelector,
} from 'src/types/supplier-orders';
import { EntityManager } from 'typeorm';
import EmailsService from './emails';
import SupplierOrderDocumentService from './supplier-order-document';
import MyCartService from './cart';
import { FlagRouter } from 'src/utils/flag-router';

type InjectedDependencies = {
	manager: EntityManager;
	supplierOrderRepository: typeof SupplierOrderRepository;
	orderService: OrderService;
	supplierOrderDocumentService: SupplierOrderDocumentService;
	cartService: MyCartService;
	regionService: RegionService;
	lineItemService: LineItemService;
	emailsService: EmailsService;
	featureFlagRouter: FlagRouter;
};

class SupplierOrderService extends TransactionBaseService {
	protected supplierOrderRepository_: typeof SupplierOrderRepository;
	protected orderService_: OrderService;
	protected supplierOrderDocumentService_: SupplierOrderDocumentService;
	protected cartService_: MyCartService;
	protected regionService_: RegionService;
	protected lineItemService_: LineItemService;
	protected emailsService_: EmailsService;
	protected readonly featureFlagRouter_: FlagRouter;

	constructor({
		supplierOrderRepository,
		supplierOrderDocumentService,
		orderService,
		cartService,
		regionService,
		lineItemService,
		emailsService,
		featureFlagRouter,
	}: InjectedDependencies) {
		super(arguments[0]);

		this.supplierOrderRepository_ = supplierOrderRepository;
		this.supplierOrderDocumentService_ = supplierOrderDocumentService;
		this.orderService_ = orderService;
		this.cartService_ = cartService;
		this.regionService_ = regionService;
		this.lineItemService_ = lineItemService;
		this.emailsService_ = emailsService;
		this.featureFlagRouter_ = featureFlagRouter;
	}

	async retrieve(
		id: string,
		config: FindConfig<SupplierOrder> = {}
	): Promise<SupplierOrder | undefined> {
		if (!isDefined(id)) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`"supplier_order_id" must be defined`
			);
		}
		const supplierOrderRepo = this.activeManager_.withRepository(
			this.supplierOrderRepository_
		);

		const supplierOrder = await supplierOrderRepo.findOne({
			where: { id },
			relations: ['supplier', 'user', 'cart', 'documents'],
		});

		return supplierOrder;
	}

	async list(
		selector: SupplierOrderSelector = {},
		config: FindConfig<SupplierOrder> = {
			skip: 0,
			take: 20,
			relations: ['supplier', 'user', 'cart', 'documents'],
		}
	): Promise<SupplierOrder[]> {
		const supplierOrderRepo = this.activeManager_.withRepository(
			this.supplierOrderRepository_
		);
		const [supplierOrders, count] = await await this.listAndCount(
			selector,
			config
		);

		return supplierOrders;
	}

	async listAndCount(
		selector: SupplierOrderSelector = {},
		config: FindConfig<SupplierOrder> = {
			skip: 0,
			take: 20,
			relations: ['supplier', 'user', 'cart', 'documents'],
		}
	): Promise<[SupplierOrder[], number]> {
		const supplierOrderRepo = this.activeManager_.withRepository(
			this.supplierOrderRepository_
		);

		const { q, ...supplierOrderSelectorRest } = selector;

		const query = buildQuery(supplierOrderSelectorRest, config);

		return await supplierOrderRepo.listAndCount(query, q);
	}

	/**
	 * Creates a cart with the line items in the input
	 * @param {EntityManager} transactionManager The transaction manager
	 * @param {CreateSupplierOrderInput} data The input data
	 * @returns {Promise<Cart>} The created cart
	 */
	async createCartWithLineItems(
		transactionManager: EntityManager,
		data: CreateSupplierOrderInput
	): Promise<Cart> {
		const { lineItems, countryCode, email } = data;
		// Get the region from the country code
		const region = await this.regionService_.retrieveByCountryCode(countryCode);
		// Create a cart for the user
		let cart = await this.cartService_
			.withTransaction(transactionManager)
			.create({
				region_id: region.id,
				email,
			});
		// Add line items in the cart
		await Promise.all(
			lineItems.map(async (lineItem) => {
				// Generate a line item from the variant
				const line = await this.lineItemService_
					.withTransaction(transactionManager)
					.generate(lineItem, {
						region_id: region.id,
						unit_price: lineItem.unit_price,
					});
				// Add the line item to the cart
				return await this.cartService_
					.withTransaction(transactionManager)
					.addOrUpdateLineItemsSupplierOrder(cart.id, line);
			})
		);
		// Retrieve the cart with the items
		cart = await this.cartService_
			.withTransaction(transactionManager)
			.retrieve(cart.id, {
				relations: [
					'items',
					'items.variant',
					'items.variant.product',
					'region',
				],
			});

		// Create payment sessions for the cart
		// await this.cartService_.setPaymentSession(
		// 	cart.id,
		// 	'manual'
		// );

		return cart;
	}

	/**
	 * Creates a supplier order
	 * @param {CreateSupplierOrderInput} data The input data
	 * @returns {Promise<SupplierOrder>} The created supplier order
	 */
	async create(data: CreateSupplierOrderInput): Promise<SupplierOrder> {
		return await this.atomicPhase_(
			async (transactionManager: EntityManager) => {
				const supplierOrderRepository = transactionManager.withRepository(
					this.supplierOrderRepository_
				);
				const {
					supplierId,
					userId,
					document_url,
					estimated_production_time,
					settlement_time,
				} = data;

				// Create a cart for the user
				const cart = await this.createCartWithLineItems(
					transactionManager,
					data
				);

				const payload = {
					supplier_id: supplierId,
					user_id: userId,
					cart_id: cart.id,
					estimated_production_time,
					settlement_time,
				};

				// Add line items in the cart
				const createSupplierOrder = supplierOrderRepository.create(payload);
				const supplierOrder = await supplierOrderRepository.save(
					createSupplierOrder
				);

				// retrieve supplier, user, cart
				const supplierOrderWithRelations = await this.retrieve(
					supplierOrder.id
				);

				// Create supplier order documents
				await this.supplierOrderDocumentService_
					.withTransaction(transactionManager)
					.create({
						supplier_order_id: supplierOrder.id,
						document_url,
					});

				const optionsEmail = {
					attachments: [
						{
							filename: `dob_purchase-order.pdf`,
							path: document_url,
						},
					],
					cc: supplierOrderWithRelations.user.email || 'admin@test.com',
				};

				// Send email to the supplier and admin
				await this.emailsService_.sendEmail(
					supplierOrderWithRelations.supplier.email,
					'supplier.order_created',
					supplierOrderWithRelations,
					optionsEmail
				);

				return supplierOrder as SupplierOrder;
			}
		);
	}
}

export default SupplierOrderService;
