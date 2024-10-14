import {
	buildQuery,
	Cart,
	FindConfig,
	LineItem,
	LineItemService,
	NewTotalsService,
	OrderService,
	RegionService,
	TotalsService,
	TransactionBaseService,
} from '@medusajs/medusa';
import {
	buildRelations,
	buildSelects,
	isDefined,
	MedusaError,
} from '@medusajs/utils';
import { SupplierOrder } from 'src/models/supplier-order';
import SupplierOrderRepository from 'src/repositories/supplier-order';
import {
	CreateSupplierOrderInput,
	SupplierOrderSelector,
	UpdateSupplierOrderInput,
} from 'src/types/supplier-orders';
import { FlagRouter } from 'src/utils/flag-router';
import { EntityManager } from 'typeorm';
import MyCartService from './cart';
import EmailsService from './emails';
import SupplierOrderDocumentService from './supplier-order-document';
import LineItemRepository from '@medusajs/medusa/dist/repositories/line-item';
import { TotalsContext } from '@medusajs/medusa/dist/types/orders';

type InjectedDependencies = {
	manager: EntityManager;
	supplierOrderRepository: typeof SupplierOrderRepository;
	lineItemRepository: typeof LineItemRepository;
	orderService: OrderService;
	supplierOrderDocumentService: SupplierOrderDocumentService;
	cartService: MyCartService;
	regionService: RegionService;
	lineItemService: LineItemService;
	emailsService: EmailsService;
	totalsService: TotalsService;
	featureFlagRouter: FlagRouter;
};

class SupplierOrderService extends TransactionBaseService {
	protected supplierOrderRepository_: typeof SupplierOrderRepository;
	protected lineItemRepository_: typeof LineItemRepository;
	protected orderService_: OrderService;
	protected supplierOrderDocumentService_: SupplierOrderDocumentService;
	protected cartService_: MyCartService;
	protected regionService_: RegionService;
	protected lineItemService_: LineItemService;
	protected emailsService_: EmailsService;
	protected readonly newTotalsService_: NewTotalsService;
	protected readonly totalsService_: TotalsService;
	protected readonly featureFlagRouter_: FlagRouter;

	constructor({
		supplierOrderRepository,
		lineItemRepository,
		supplierOrderDocumentService,
		orderService,
		cartService,
		regionService,
		lineItemService,
		emailsService,
		totalsService,
		featureFlagRouter,
	}: InjectedDependencies) {
		super(arguments[0]);

		this.supplierOrderRepository_ = supplierOrderRepository;
		this.lineItemRepository_ = lineItemRepository;
		this.supplierOrderDocumentService_ = supplierOrderDocumentService;
		this.orderService_ = orderService;
		this.cartService_ = cartService;
		this.regionService_ = regionService;
		this.lineItemService_ = lineItemService;
		this.emailsService_ = emailsService;
		this.totalsService_ = totalsService;
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

		const { totalsToSelect } = this.transformQueryForTotals(config);

		const supplierOrderRepo = this.activeManager_.withRepository(
			this.supplierOrderRepository_
		);

		// const supplierOrder = await supplierOrderRepo.findOne({
		// 	where: { id },
		// 	relations: ['supplier', 'user', 'cart', 'documents', 'items'],
		// });

		// return supplierOrder;

		const query = buildQuery({ id: id }, config);

		if (!(config.select || []).length) {
			query.select = undefined;
		}
		const queryRelations = {
			...query.relations,
			documents: true,
			supplier: true,
			user: true,
		};
		delete query.relations;

		const raw = await supplierOrderRepo.findOneWithRelations(
			queryRelations,
			query
		);

		if (!raw) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`Order with id ${id} was not found`
			);
		}

		return raw;
	}

	async retrieveWithTotals(
		orderId: string,
		options: FindConfig<SupplierOrder> = {},
		context: TotalsContext = {}
	): Promise<SupplierOrder> {
		const relations = this.getTotalsRelations(options);
		const supplierOrder = await this.retrieve(orderId, {
			...options,
			relations,
		});
		console.log('retrieve totals', relations);

		return await this.decorateTotals(supplierOrder, context);
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
		console.log('selector', selector);

		const { q, ...supplierOrderSelectorRest } = selector;
		console.log('supplierOrderSelectorRest', supplierOrderSelectorRest);

		const query = buildQuery(supplierOrderSelectorRest, config);

		// Get totals relations and transform query for totals
		const { select, relations } = this.transformQueryForTotals(config);
		query.select = buildSelects(select || []); // Select necessary fields
		const rels = buildRelations(this.getTotalsRelations({ relations })); // Get necessary relations

		// Remove original relations from the query to avoid conflicts
		delete query.relations;

		// Fetch the results with relations
		const raw = await supplierOrderRepo.findWithRelations(rels, query);
		const count = await supplierOrderRepo.count(query);

		// Decorate totals if required (example of a placeholder function for calculating totals)
		const supplierOrders = await Promise.all(
			raw.map(async (r) => await this.decorateTotals(r, select))
		);


		// Return the orders along with the count
		return [supplierOrders, count];
	}

	protected transformQueryForTotals(config: FindConfig<SupplierOrder>): {
		relations: string[] | undefined;
		select: FindConfig<SupplierOrder>['select'];
		totalsToSelect: FindConfig<SupplierOrder>['select'];
	} {
		let { select, relations } = config;
		console.log('config transform', config);

		if (!select) {
			console.log('none');
			return {
				select,
				relations,
				totalsToSelect: [],
			};
		}

		const totalFields = [
			'subtotal',
			'tax_total',
			'total',
			'paid_total',
			'items.refundable',
		];

		const totalsToSelect = select.filter((v) => totalFields.includes(v));
		if (totalsToSelect.length > 0) {
			const relationSet = new Set(relations);
			relationSet.add('items');
			relationSet.add('items.tax_lines');
			relationSet.add('items.adjustments');
			relationSet.add('items.variant');
			relationSet.add('items.variant.product');
			relationSet.add('region');
			relations = [...relationSet];

			select = select.filter((v) => !totalFields.includes(v));
		}

		const toSelect = [...select];
		console.log('toSelect', toSelect);
		if (toSelect.length > 0 && toSelect.indexOf('tax_rate') === -1) {
			toSelect.push('tax_rate');
		}

		return {
			relations,
			select: toSelect.length ? toSelect : undefined,
			totalsToSelect,
		};
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

				console.log('data service', data);
				const LineItemService =
					this.lineItemService_.withTransaction(transactionManager);
				const {
					supplierId,
					userId,
					document_url,
					region_id,
					estimated_production_time,
					settlement_time,
					currency_code,
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
					region_id,
					currency_code,
					estimated_production_time,
					settlement_time,
				};

				// Add line items in the cart
				const createSupplierOrder = supplierOrderRepository.create(payload);
				const supplierOrder = await supplierOrderRepository.save(
					createSupplierOrder
				);

				// Update line items with the supplier_order_id
				await LineItemService.update({ cart_id: cart.id }, {
					supplier_order_id: supplierOrder.id,
				} as any);

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

	/**
	 * Update a cart with the line items in the input
	 * @param {EntityManager} transactionManager The transaction manager
	 * @param {UpdateSupplierOrderInput} data The input data
	 * @returns {Promise<Cart>} The updated cart
	 */
	async updateCartWithLineItems(
		transactionManager: EntityManager,
		data: UpdateSupplierOrderInput
	): Promise<Cart> {
		const { cartId, lineItems, metadata } = data;

		// Retrieve the cart
		let cart = await this.cartService_
			.withTransaction(transactionManager)
			.retrieve(cartId, {
				relations: ['region'],
			});

		// Add line items in the cart
		await Promise.all(
			lineItems.map(async (lineItem) => {
				// Generate a line item from the variant
				const line = await this.lineItemService_
					.withTransaction(transactionManager)
					.generate(lineItem, {
						region_id: cart.region_id,
						unit_price: lineItem?.unit_price,
						metadata,
					});
				// Add the line item to the cart
				return await this.cartService_
					.withTransaction(transactionManager)
					.addOrUpdateLineItemsSupplierOrder(cartId, line);
			})
		);

		// Retrieve and return the updated cart
		return await this.cartService_
			.withTransaction(transactionManager)
			.retrieve(cartId, {
				relations: [
					'items',
					'items.variant',
					'items.variant.product',
					'region',
				],
			});
	}

	/**
	 * Creates a supplier order
	 * @param {UpdateSupplierOrderInput} data The input data
	 * @returns {Promise<SupplierOrder>} The created supplier order
	 */
	async update(
		id: string,
		data: UpdateSupplierOrderInput
	): Promise<SupplierOrder> {
		return await this.atomicPhase_(
			async (transactionManager: EntityManager) => {
				// Retrieve the existing supplier order
				const existingSupplierOrder = await this.retrieve(id);
				if (!existingSupplierOrder) {
					throw new MedusaError(
						MedusaError.Types.NOT_FOUND,
						`Đơn hàng với mã số ${id} không được tìm thấy`
					);
				}

				// Update the cart with new line items
				await this.updateCartWithLineItems(transactionManager, data);

				// Retrieve the updated supplier order
				const updatedSupplierOrder = await this.retrieve(id);
				return updatedSupplierOrder;
			}
		);
	}

	async deleteLineItem(
		supplierOrderId: string,
		lineItemId: string
	): Promise<SupplierOrder> {
		return await this.atomicPhase_(
			async (transactionManager: EntityManager) => {
				// Retrieve the existing supplier order
				const existingSupplierOrder = await this.retrieve(supplierOrderId);
				if (!existingSupplierOrder) {
					throw new MedusaError(
						MedusaError.Types.NOT_FOUND,
						`Supplier order with id ${supplierOrderId} not found`
					);
				}

				// Remove the line item from the cart
				await this.cartService_
					.withTransaction(transactionManager)
					.removeLineItem(existingSupplierOrder.cart_id, lineItemId);

				// Retrieve and return the updated supplier order
				const updatedSupplierOrder = await this.retrieve(supplierOrderId);
				return updatedSupplierOrder;
			}
		);
	}

	async retrieveLineItemsById(
		supplierOrderId: string
	): Promise<LineItem[] | undefined> {
		const lineItemRepo = this.activeManager_.withRepository(
			this.lineItemRepository_
		);

		const lineItems = await lineItemRepo.find({
			where: { supplier_order_id: supplierOrderId } as any,
		});
		return lineItems;
	}

	async decorateTotals(
		supplierOrder: SupplierOrder,
		totalsFields?: string[]
	): Promise<SupplierOrder>;

	async decorateTotals(
		supplierOrder: SupplierOrder,
		context?: TotalsContext
	): Promise<SupplierOrder>;

	/**
	 * Calculate and attach the different total fields on the object
	 * @param supplierOrder
	 * @param totalsFieldsOrContext
	 */
	async decorateTotals(
		supplierOrder: SupplierOrder,
		totalsFieldsOrContext?: string[] | TotalsContext
	): Promise<SupplierOrder> {
		// const newTotalsServiceTx = this.newTotalsService_.withTransaction(
		// 	this.activeManager_
		// );

		// console.log('newTotalsServiceTx', newTotalsServiceTx);

		const allItems: LineItem[] = [...(supplierOrder.items ?? [])];

		// const itemsTotals = await newTotalsServiceTx.getLineItemTotals(allItems, {
		// 	taxRate: supplierOrder.tax_rate,
		// 	includeTax: true,
		// 	calculationContext,
		// });

		supplierOrder.subtotal = 0;

		supplierOrder.paid_total =
			supplierOrder.payments?.reduce((acc, next) => (acc += next.amount), 0) ||
			0;

		let item_tax_total = 0;

		supplierOrder.items = (supplierOrder.items || []).map((item) => {
			item.quantity = item.quantity - (item.returned_quantity || 0);

			// Object.assign(item, itemsTotals[item.id] ?? {}, { returned_quantity: 0 });

			item.subtotal = item.unit_price * item.quantity;
			supplierOrder.subtotal += item.subtotal ?? 0;

			return item;
		});

		supplierOrder.tax_total = item_tax_total;

		supplierOrder.total = supplierOrder.subtotal + supplierOrder.tax_total;

		return supplierOrder;
	}

	private getTotalsRelations(config: FindConfig<SupplierOrder>): string[] {
		const relationSet = new Set(config.relations);

		relationSet.add('items');
		relationSet.add('items.tax_lines');
		relationSet.add('items.adjustments');
		relationSet.add('items.variant');
		relationSet.add('region');

		return Array.from(relationSet.values());
	}
}

export default SupplierOrderService;
