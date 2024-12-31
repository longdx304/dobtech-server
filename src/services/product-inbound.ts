import {
	buildQuery,
	FindConfig,
	LineItemService,
	ProductVariantService,
	TransactionBaseService,
} from '@medusajs/medusa';
import LineItemRepository from '@medusajs/medusa/dist/repositories/line-item';
import { TotalsContext } from '@medusajs/medusa/dist/types/orders';
import { isDefined, MedusaError } from '@medusajs/utils';
import SupplierOrderRepository from 'src/repositories/supplier-order';
import {
	AdminPostItemInventory,
	CreateWarehouseWithVariant,
} from 'src/types/warehouse';
import { EntityManager, In } from 'typeorm';
import {
	FulfillSupplierOrderStt,
	SupplierOrder,
} from '../models/supplier-order';
import InventoryTransactionService from './inventory-transaction';
import SupplierOrderService from './supplier-order';
import WarehouseService from './warehouse';
import WarehouseInventoryService from './warehouse-inventory';

type InjectedDependencies = {
	manager: EntityManager;
	supplierOrderRepository: typeof SupplierOrderRepository;
	lineItemRepository: typeof LineItemRepository;
	lineItemService: LineItemService;
	supplierOrderService: SupplierOrderService;
	productVariantService: ProductVariantService;
	warehouseService: WarehouseService;
	warehouseInventoryService: WarehouseInventoryService;
	inventoryTransactionService: InventoryTransactionService;
};

class ProductInboundService extends TransactionBaseService {
	protected supplierOrderRepository_: typeof SupplierOrderRepository;
	protected lineItemRepository_: typeof LineItemRepository;
	protected lineItemService_: LineItemService;
	protected supplierOrderService_: SupplierOrderService;
	protected productVariantService_: ProductVariantService;
	protected warehouseService_: WarehouseService;
	protected warehouseInventoryService_: WarehouseInventoryService;
	protected inventoryTransactionService_: InventoryTransactionService;

	constructor({
		supplierOrderRepository,
		lineItemRepository,
		lineItemService,
		supplierOrderService,
		productVariantService,
		warehouseService,
		warehouseInventoryService,
		inventoryTransactionService,
	}: InjectedDependencies) {
		super(arguments[0]);

		this.supplierOrderRepository_ = supplierOrderRepository;
		this.lineItemRepository_ = lineItemRepository;
		this.lineItemService_ = lineItemService;
		this.supplierOrderService_ = supplierOrderService;
		this.productVariantService_ = productVariantService;
		this.warehouseService_ = warehouseService;
		this.warehouseInventoryService_ = warehouseInventoryService;
		this.inventoryTransactionService_ = inventoryTransactionService;
	}

	async listAndCount(
		status: FulfillSupplierOrderStt | FulfillSupplierOrderStt[],
		myOrder?: boolean,
		user_id?: string,
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
			relations: ['handler'],
			order: config.order || { created_at: 'DESC' },
		};

		let whereClause: any = Array.isArray(status)
			? { fulfillment_status: In(status) }
			: { fulfillment_status: status };

		// Add handler_id filter for non-admin users
		if (myOrder) {
			whereClause = {
				...whereClause,
				handler_id: user_id,
			};
		}

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
			handler: true,
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
				FulfillSupplierOrderStt.PARTIALLY_INVENTORIED,
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

	async confirmInboundById(id: string) {
		return this.atomicPhase_(async (manager) => {
			const supplierOrderRepo = manager.withRepository(
				this.supplierOrderRepository_
			);

			const supplierOrder = await supplierOrderRepo.findOne({
				where: { id },
				relations: ['items', 'items.variant'],
			});

			if (!supplierOrder) {
				throw new MedusaError(
					MedusaError.Types.NOT_FOUND,
					`Không tìm thấy đơn hàng với id ${id}`
				);
			}

			const lineItemServiceTx = this.lineItemService_.withTransaction(manager);

			const productVariantServiceTx =
				this.productVariantService_.withTransaction(manager);

			let isFullyInventoried = true;

			let inventoryCogs = 0;
			let currentPrice = 0;
			let avgCorsPrice = 0;

			// Process each line item
			for (const item of supplierOrder.items) {
				// Default fulfilled_quantity to 0 if not set
				const fulfilledQuantity = item.fulfilled_quantity ?? 0;
				const warehouseQuantity = item.warehouse_quantity;

				const additionalInventory = warehouseQuantity - fulfilledQuantity;

				// Check if the variant exists
				if (!item.variant) {
					throw new MedusaError(
						MedusaError.Types.NOT_FOUND,
						`Không tìm thấy variant với id ${item.variant_id}`
					);
				}

				// retrieve the variant
				const currentVariant = await productVariantServiceTx.retrieve(
					item.variant_id
				);

				// inventory cogs for whole warehouse
				inventoryCogs =
					currentVariant.inventory_quantity *
					(currentVariant.cogs_price ||
						currentVariant.supplier_price ||
						item.unit_price);

				// Update current price for this order
				currentPrice = additionalInventory * item.unit_price;

				// Update inventory cogs
				avgCorsPrice = Math.round(
					(currentPrice + inventoryCogs) /
						(currentVariant.inventory_quantity + additionalInventory)
				);

				// Update inventory quantity
				await productVariantServiceTx.update(item.variant.id, {
					inventory_quantity:
						item.variant.inventory_quantity + additionalInventory,
					cogs_price: avgCorsPrice,
				} as any);

				await lineItemServiceTx.update(item.id, {
					fulfilled_quantity: warehouseQuantity,
				});

				// Check if this item is partially inventoried

				if (warehouseQuantity !== item.quantity) {
					isFullyInventoried = false;
				}
			}

			// Update supplier order status
			supplierOrder.fulfillment_status = isFullyInventoried
				? FulfillSupplierOrderStt.INVENTORIED
				: FulfillSupplierOrderStt.PARTIALLY_INVENTORIED;
			supplierOrder.inventoried_at = new Date();

			await supplierOrderRepo.save(supplierOrder);

			return supplierOrder;
		});
	}

	async createWarehouseAndInventoryTransaction(
		dataWarehouse: CreateWarehouseWithVariant,
		dataItemInventory: AdminPostItemInventory,
		user_id: string
	) {
		return this.atomicPhase_(async (manager: EntityManager) => {
			const warehouseServiceTx =
				this.warehouseService_.withTransaction(manager);

			const warehouseInventoryServiceTx =
				this.warehouseInventoryService_.withTransaction(manager);

			const inventoryTransactionServiceTx =
				this.inventoryTransactionService_.withTransaction(manager);

			const warehouse = await warehouseServiceTx.createWarehouseWithVariant(
				dataWarehouse
			);

			// retrieve warehouse
			const warehouseInventory =
				await warehouseInventoryServiceTx.retrieveByWarehouseAndVariant(
					warehouse.id,
					dataItemInventory.variant_id,
					dataWarehouse.unit_id
				);

			const inventoryTransaction = await inventoryTransactionServiceTx.create({
				...dataItemInventory,
				warehouse_id: warehouse.id,
				warehouse_inventory_id: warehouseInventory.id,
				user_id,
			});

			return { warehouse, inventoryTransaction };
		});
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

	async assignToHandler(id: string, userId: string) {
		const supplierOrderRepo = this.activeManager_.withRepository(
			this.supplierOrderRepository_
		);

		const supplierOrder = await supplierOrderRepo.findOne({
			where: { id },
		});

		if (!supplierOrder) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`Không tìm thấy đơn hàng với id ${id}`
			);
		}

		if (supplierOrder?.handler_id) {
			throw new MedusaError(
				MedusaError.Types.NOT_ALLOWED,
				`Đơn hàng này đã có người xử lý`
			);
		}

		supplierOrder.handler_id = userId;

		await supplierOrderRepo.save(supplierOrder);

		return supplierOrder;
	}

	// Remove handler from supplier order
	async removeHandler(id: string, userId: string) {
		const supplierOrderRepo = this.activeManager_.withRepository(
			this.supplierOrderRepository_
		);

		const supplierOrder = await supplierOrderRepo.findOne({
			where: { id },
		});

		if (!supplierOrder) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`Không tìm thấy đơn hàng với id ${id}`
			);
		}

		if (supplierOrder?.handler_id !== userId) {
			throw new MedusaError(
				MedusaError.Types.NOT_ALLOWED,
				`Bạn không thể xóa người xử lý của đơn hàng này`
			);
		}

		supplierOrder.handler_id = null;

		await supplierOrderRepo.save(supplierOrder);

		return supplierOrder;
	}
}

export default ProductInboundService;
