import {
	buildQuery,
	FindConfig,
	LineItemService,
	TransactionBaseService,
} from '@medusajs/medusa';
import LineItemRepository from '@medusajs/medusa/dist/repositories/line-item';
import { TotalsContext } from '@medusajs/medusa/dist/types/orders';
import { isDefined, MedusaError } from '@medusajs/utils';
import SupplierOrderRepository from 'src/repositories/supplier-order';
import { EntityManager, In } from 'typeorm';
import {
	FulfillSupplierOrderStt,
	SupplierOrder,
} from '../models/supplier-order';
import SupplierOrderService from './supplier-order';

type InjectedDependencies = {
	manager: EntityManager;
	supplierOrderRepository: typeof SupplierOrderRepository;
	lineItemRepository: typeof LineItemRepository;
	lineItemService: LineItemService;
	supplierOrderService: SupplierOrderService;
};

class ProductInboundService extends TransactionBaseService {
	protected supplierOrderRepository_: typeof SupplierOrderRepository;
	protected lineItemRepository_: typeof LineItemRepository;
	protected lineItemService_: LineItemService;
	protected supplierOrderService_: SupplierOrderService;

	constructor({
		supplierOrderRepository,
		lineItemRepository,
		lineItemService,
		supplierOrderService,
	}: InjectedDependencies) {
		super(arguments[0]);

		this.supplierOrderRepository_ = supplierOrderRepository;
		this.lineItemRepository_ = lineItemRepository;
		this.lineItemService_ = lineItemService;
		this.supplierOrderService_ = supplierOrderService;
	}

	async listAndCount(
		status: FulfillSupplierOrderStt | FulfillSupplierOrderStt[],
		config: FindConfig<SupplierOrder> = {
			skip: 0,
			take: 20,
		}
	): Promise<[SupplierOrder[], number]> {
		const supplierOrderRepo = this.activeManager_.withRepository(
			this.supplierOrderRepository_
		);

		const queryConfig = {
			skip: config.skip || 0,
			take: config.take || 20,
			relations: config.relations,
			order: config.order || { created_at: 'ASC' },
		};

		const whereClause = Array.isArray(status)
			? { fulfillment_status: In(status) } // Handle multiple statuses
			: { fulfillment_status: status }; // Handle a single status

		const query = buildQuery(whereClause, queryConfig);

		const count = await supplierOrderRepo.count(query);

		// Then get the actual records
		const supplierOrders = await supplierOrderRepo.find(query);

		return [supplierOrders, count];
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

		const query = buildQuery(
			{
				id: id,
			},
			config
		);

		if (!(config.select || []).length) {
			query.select = undefined;
		}
		const queryRelations = {
			...query.relations,
			documents: true,
			supplier: true,
			user: true,
			cart: true,
			payments: true,
			refunds: true,
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

		// Check if the order status is either DELIVERED or INVENTORIED
		if (
			![
				FulfillSupplierOrderStt.DELIVERED,
				FulfillSupplierOrderStt.INVENTORIED,
			].includes(raw.fulfillment_status)
		) {
			throw new MedusaError(
				MedusaError.Types.NOT_ALLOWED,
				`Order with id ${id} is not in DELIVERED or INVENTORIED status`
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

		return await this.decorateTotals(supplierOrder, context);
	}

	async update() {}

	async delete() {}

	async createInbound() {}

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
		supplierOrder.subtotal = 0;

		supplierOrder.refunded_total =
			Math.round(
				supplierOrder.refunds?.reduce((acc, next) => acc + next.amount, 0)
			) || 0;
		supplierOrder.paid_total =
			supplierOrder.payments?.reduce((acc, next) => (acc += next.amount), 0) ||
			0;
		supplierOrder.refundable_amount =
			supplierOrder.paid_total - supplierOrder.refunded_total || 0;

		let item_tax_total = 0;

		supplierOrder.items = (supplierOrder.items || []).map((item) => {
			item.quantity = item.quantity - (item.returned_quantity || 0);

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
		relationSet.add('refunds');
		relationSet.add('payments');

		return Array.from(relationSet.values());
	}
}

export default ProductInboundService;
