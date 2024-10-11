import {
	Cart,
	EventBusService,
	LineItem,
	LineItemAdjustmentService,
	LineItemService,
	NewTotalsService,
	OrderEdit,
	OrderEditItemChangeService,
	OrderEditItemChangeType,
	OrderEditStatus,
	OrderService,
	TaxProviderService,
	TotalsService,
	TransactionBaseService,
} from '@medusajs/medusa';
import { FindConfig, Selector } from '@medusajs/medusa/dist/types/common';
import { buildQuery, isString } from '@medusajs/medusa/dist/utils';
import { MedusaError, isDefined } from 'medusa-core-utils';
import {
	AddOrderEditLineItemInput,
	CreateOrderEditInput,
} from 'src/types/order-edits';
import {
	DeepPartial,
	EntityManager,
	FindOptionsWhere,
	ILike,
	IsNull,
	FindOptions,
} from 'typeorm';

import { IInventoryService } from '@medusajs/types';
import { UpdateSupplierOrderInput } from 'src/types/supplier-orders';
import OrderEditRepository from '../repositories/order-edit';
import SupplierOrderService from './supplier-order';
import { SupplierOrder } from 'src/models/supplier-order';

type InjectedDependencies = {
	manager: EntityManager;
	orderEditRepository: typeof OrderEditRepository;

	orderService: OrderService;
	supplierOrderService: SupplierOrderService;
	totalsService: TotalsService;
	newTotalsService: NewTotalsService;
	lineItemService: LineItemService;
	eventBusService: EventBusService;
	taxProviderService: TaxProviderService;
	lineItemAdjustmentService: LineItemAdjustmentService;
	orderEditItemChangeService: OrderEditItemChangeService;

	inventoryService?: IInventoryService;
};

export default class MyOrderEditService extends TransactionBaseService {
	static readonly Events = {
		CREATED: 'order-edit.created',
		UPDATED: 'order-edit.updated',
		DECLINED: 'order-edit.declined',
		REQUESTED: 'order-edit.requested',
		CANCELED: 'order-edit.canceled',
		CONFIRMED: 'order-edit.confirmed',

		S_CREATED: 'supplier-order.created',
		S_UPDATED: 'supplier-order.updated',
		S_DECLINED: 'supplier-order.declined',
		S_REQUESTED: 'supplier-order.requested',
		S_CANCELED: 'supplier-order.canceled',
		S_CONFIRMED: 'supplier-order.confirmed',
	};

	protected readonly orderEditRepository_: typeof OrderEditRepository;

	protected readonly supplierOrderService_: SupplierOrderService;
	protected readonly orderService_: OrderService;
	protected readonly totalsService_: TotalsService;
	protected readonly newTotalsService_: NewTotalsService;
	protected readonly lineItemService_: LineItemService;
	protected readonly eventBusService_: EventBusService;
	protected readonly taxProviderService_: TaxProviderService;
	protected readonly lineItemAdjustmentService_: LineItemAdjustmentService;
	protected readonly orderEditItemChangeService_: OrderEditItemChangeService;
	protected readonly inventoryService_: IInventoryService | undefined;

	constructor({
		orderEditRepository,
		supplierOrderService,
		orderService,
		lineItemService,
		eventBusService,
		totalsService,
		newTotalsService,
		orderEditItemChangeService,
		lineItemAdjustmentService,
		taxProviderService,
		inventoryService,
	}: InjectedDependencies) {
		// eslint-disable-next-line prefer-rest-params
		super(arguments[0]);

		this.supplierOrderService_ = supplierOrderService;
		this.orderEditRepository_ = orderEditRepository;
		this.orderService_ = orderService;
		this.lineItemService_ = lineItemService;
		this.eventBusService_ = eventBusService;
		this.totalsService_ = totalsService;
		this.newTotalsService_ = newTotalsService;
		this.orderEditItemChangeService_ = orderEditItemChangeService;
		this.lineItemAdjustmentService_ = lineItemAdjustmentService;
		this.taxProviderService_ = taxProviderService;
		this.inventoryService_ = inventoryService;
	}

	async retrieveSupplierOrderEdit(
		orderEditId: string,
		config: FindConfig<OrderEdit> = {}
	): Promise<OrderEdit> {
		if (!isDefined(orderEditId)) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`"orderEditId" must be defined`
			);
		}

		const orderEditRepository = this.activeManager_.withRepository(
			this.orderEditRepository_
		);

		const query = buildQuery({ id: orderEditId }, config);
		const orderEdit = await orderEditRepository.findOne(query);

		if (!orderEdit) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`Order edit with id ${orderEditId} was not found`
			);
		}

		return orderEdit;
	}

	async listAndCount(
		selector: Selector<OrderEdit> & { q?: string },
		config?: FindConfig<OrderEdit>
	): Promise<[OrderEdit[], number]> {
		const orderEditRepository = this.activeManager_.withRepository(
			this.orderEditRepository_
		);

		let q;
		if (isString(selector.q)) {
			q = selector.q;
			delete selector.q;
		}

		const query = buildQuery(selector, config);
		query.where = query.where as FindOptionsWhere<OrderEdit>;

		if (q) {
			query.where.internal_note = ILike(`%${q}%`);
		}

		return await orderEditRepository.findAndCount(query);
	}

	async listSupplierOrderEdits(
		selector: Selector<OrderEdit>,
		config?: FindConfig<OrderEdit>
	): Promise<OrderEdit[]> {
		const [orderEdits] = await this.listAndCount(selector, config);
		return orderEdits;
	}

	async createSupplierOrderEdit(
		data: CreateOrderEditInput,
		context: { createdBy: string }
	): Promise<OrderEdit> {
		return await this.atomicPhase_(async (transactionManager) => {
			const activeOrderEdit = await this.retrieveActiveSupplierOrderEdit(
				data.supplier_order_id
			);

			if (activeOrderEdit) {
				throw new MedusaError(
					MedusaError.Types.INVALID_DATA,
					`An active supplier order edit already exists for the order ${data.supplier_order_id}`
				);
			}

			const orderEditRepository = transactionManager.withRepository(
				this.orderEditRepository_
			);

			const orderEditToCreate = orderEditRepository.create({
				supplier_order_id: data.supplier_order_id,
				internal_note: data.internal_note,
				created_by: context.createdBy,
			});

			const orderEdit = await orderEditRepository.save(orderEditToCreate);

			const lineItemServiceTx =
				this.lineItemService_.withTransaction(transactionManager);

			const orderLineItems = await lineItemServiceTx.list(
				{
					supplier_order_id: data.supplier_order_id,
				} as any,
				{
					select: ['id'],
				}
			);

			const lineItemIds = orderLineItems.map(({ id }) => id);
			await lineItemServiceTx.cloneTo(lineItemIds, {
				order_edit_id: orderEdit.id,
			});

			await this.eventBusService_
				.withTransaction(transactionManager)
				.emit(MyOrderEditService.Events.S_CREATED, { id: orderEdit.id });

			return orderEdit;
		});
	}

	async updateSupplierOrderEdit(
		orderEditId: string,
		data: DeepPartial<OrderEdit>
	): Promise<OrderEdit> {
		return await this.atomicPhase_(async (manager) => {
			const orderEditRepo = manager.withRepository(this.orderEditRepository_);

			const orderEdit = await this.retrieveSupplierOrderEdit(orderEditId);

			for (const key of Object.keys(data)) {
				if (isDefined(data[key])) {
					orderEdit[key] = data[key];
				}
			}

			const result = await orderEditRepo.save(orderEdit);

			await this.eventBusService_
				.withTransaction(manager)
				.emit(MyOrderEditService.Events.S_UPDATED, {
					id: result.id,
				});

			return result;
		});
	}

	async deleteSupplierOrderEdit(id: string): Promise<void> {
		return await this.atomicPhase_(async (manager) => {
			const orderEditRepo = manager.withRepository(this.orderEditRepository_);

			const edit = await this.retrieveSupplierOrderEdit(id).catch(() => void 0);

			if (!edit) {
				return;
			}

			if (edit.status !== OrderEditStatus.CREATED) {
				throw new MedusaError(
					MedusaError.Types.NOT_ALLOWED,
					`Cannot delete order edit with status ${edit.status}`
				);
			}

			await this.deleteClonedItems(id);
			await orderEditRepo.remove(edit);
		});
	}

	async declineSupplierOrderEdit(
		orderEditId: string,
		context: {
			declinedReason?: string;
			declinedBy?: string;
		}
	): Promise<OrderEdit> {
		return await this.atomicPhase_(async (manager) => {
			const orderEditRepo = manager.withRepository(this.orderEditRepository_);

			const { declinedBy, declinedReason } = context;

			const orderEdit = await this.retrieveSupplierOrderEdit(orderEditId);

			if (orderEdit.status === OrderEditStatus.DECLINED) {
				return orderEdit;
			}

			if (orderEdit.status !== OrderEditStatus.REQUESTED) {
				throw new MedusaError(
					MedusaError.Types.NOT_ALLOWED,
					`Cannot decline an order edit with status ${orderEdit.status}.`
				);
			}

			orderEdit.declined_at = new Date();
			orderEdit.declined_by = declinedBy;
			orderEdit.declined_reason = declinedReason;

			const result = await orderEditRepo.save(orderEdit);

			await this.eventBusService_
				.withTransaction(manager)
				.emit(MyOrderEditService.Events.S_DECLINED, {
					id: result.id,
				});

			return result;
		});
	}

	/**
	 * Create or update order edit item change line item and apply the quantity
	 * - If the item change already exists then update the quantity of the line item as well as the line adjustments
	 * - If the item change does not exist then create the item change of type update and apply the quantity as well as update the line adjustments
	 * @param orderEditId
	 * @param itemId
	 * @param data
	 */
	async updateLineItemSupplierOrderEdit(
		orderEditId: string,
		itemId: string,
		data: { quantity: number }
	): Promise<void> {
		return await this.atomicPhase_(async (manager) => {
			const orderEdit = await this.retrieveSupplierOrderEdit(orderEditId, {
				select: [
					'id',
					'supplier_order_id',
					'created_at',
					'requested_at',
					'confirmed_at',
					'declined_at',
					'canceled_at',
				],
			});

			const isOrderEditActive = MyOrderEditService.isOrderEditActive(orderEdit);
			if (!isOrderEditActive) {
				throw new MedusaError(
					MedusaError.Types.NOT_ALLOWED,
					`Can not update an item on the order edit ${orderEditId} with the status ${orderEdit.status}`
				);
			}

			const lineItemServiceTx = this.lineItemService_.withTransaction(manager);

			const lineItem = await lineItemServiceTx.retrieve(itemId, {
				select: ['id', 'order_edit_id', 'original_item_id'],
			});

			if (lineItem.order_edit_id !== orderEditId) {
				throw new MedusaError(
					MedusaError.Types.INVALID_DATA,
					`Invalid line item id ${itemId} it does not belong to the same order edit ${orderEdit.order_id}.`
				);
			}

			const orderEditItemChangeServiceTx =
				this.orderEditItemChangeService_.withTransaction(manager);

			// Can be of type update or add
			let change = (
				await orderEditItemChangeServiceTx.list(
					{ line_item_id: itemId },
					{
						select: ['line_item_id', 'original_line_item_id'],
					}
				)
			).pop();

			// if a change does not exist it means that we are updating an existing item and therefore creating an update change.
			// otherwise we are updating either a change of type ADD or UPDATE
			if (!change) {
				change = await orderEditItemChangeServiceTx.create({
					type: OrderEditItemChangeType.ITEM_UPDATE,
					order_edit_id: orderEditId,
					original_line_item_id: lineItem.original_item_id as string,
					line_item_id: itemId,
				});
			}

			await lineItemServiceTx.update(change.line_item_id!, {
				quantity: data.quantity,
			});

			await this.refreshAdjustments(orderEditId, {
				preserveCustomAdjustments: true,
			});
		});
	}

	async removeLineItemSupplierOrderEdit(
		orderEditId: string,
		lineItemId: string
	): Promise<void> {
		return await this.atomicPhase_(async (manager) => {
			const orderEdit = await this.retrieveSupplierOrderEdit(orderEditId, {
				select: [
					'id',
					'created_at',
					'requested_at',
					'confirmed_at',
					'declined_at',
					'canceled_at',
				],
			});

			const isOrderEditActive = MyOrderEditService.isOrderEditActive(orderEdit);

			if (!isOrderEditActive) {
				throw new MedusaError(
					MedusaError.Types.NOT_ALLOWED,
					`Can not update an item on the order edit ${orderEditId} with the status ${orderEdit.status}`
				);
			}

			const lineItem = await this.lineItemService_
				.withTransaction(manager)
				.retrieve(lineItemId, {
					select: ['id', 'order_edit_id', 'original_item_id'],
				})
				.catch(() => void 0);

			if (!lineItem) {
				return;
			}

			if (
				lineItem.order_edit_id !== orderEditId ||
				!lineItem.original_item_id
			) {
				throw new MedusaError(
					MedusaError.Types.INVALID_DATA,
					`Invalid line item id ${lineItemId} it does not belong to the same order edit ${orderEdit.order_id}.`
				);
			}

			await this.lineItemService_
				.withTransaction(manager)
				.deleteWithTaxLines(lineItem.id);

			await this.refreshAdjustments(orderEditId);

			await this.orderEditItemChangeService_.withTransaction(manager).create({
				original_line_item_id: lineItem.original_item_id,
				type: OrderEditItemChangeType.ITEM_REMOVE,
				order_edit_id: orderEdit.id,
			});
		});
	}

	async refreshAdjustments(
		orderEditId: string,
		config = { preserveCustomAdjustments: false }
	) {
		const lineItemAdjustmentServiceTx =
			this.lineItemAdjustmentService_.withTransaction(this.activeManager_);

		const orderEdit = await this.retrieveSupplierOrderEdit(orderEditId, {
			relations: [
				'items',
				'items.variant',
				'items.adjustments',
				'items.tax_lines',
				// 'order',
				// 'order.customer',
				// 'order.discounts',
				// 'order.discounts.rule',
				// 'order.gift_cards',
				// 'order.region',
				// 'order.shipping_address',
				// 'order.shipping_methods',
			],
		});

		const clonedItemAdjustmentIds: string[] = [];

		orderEdit.items.forEach((item) => {
			if (item.adjustments?.length) {
				item.adjustments.forEach((adjustment) => {
					const preserveAdjustment = config.preserveCustomAdjustments
						? !!adjustment.discount_id
						: true;

					if (preserveAdjustment) {
						clonedItemAdjustmentIds.push(adjustment.id);
					}
				});
			}
		});

		await lineItemAdjustmentServiceTx.delete(clonedItemAdjustmentIds);

		const localCart = {
			// ...orderEdit.s,
			object: 'cart',
			items: orderEdit.items,
		} as unknown as Cart;

		await lineItemAdjustmentServiceTx.createAdjustments(localCart);
	}

	async decorateTotalsSupplierOrderEdit(
		orderEdit: OrderEdit
	): Promise<OrderEdit> {
		const { supplier_order_id, items } = await this.retrieveSupplierOrderEdit(
			orderEdit.id,
			{
				select: ['id', 'supplier_order_id', 'items'],
				relations: [
					'items',
					'items.tax_lines',
					'items.adjustments',
					'items.variant',
				],
			}
		);

		const supplierOrderServiceTx = this.supplierOrderService_.withTransaction(
			this.activeManager_
		);

		const supplierOrder = await supplierOrderServiceTx.retrieve(
			supplier_order_id,
			{
				relations: [
					'discounts',
					'discounts.rule',
					'gift_cards',
					'region',
					'items',
					'items.tax_lines',
					'items.adjustments',
					'items.variant',
					'region.tax_rates',
					'shipping_methods',
					'shipping_methods.tax_lines',
				],
			}
		);

		// const computedOrder = { ...order, items } as Order;
		// const computedOrder = {
		// 	...supplierOrder,
		// 	items,
		// } as SupplierOrder;

		// orderEdit.items = computedOrder.items;
		// orderEdit.discount_total = computedOrder.discount_total;
		// orderEdit.gift_card_total = computedOrder.gift_card_total;
		// orderEdit.gift_card_tax_total = computedOrder.gift_card_tax_total;
		// orderEdit.shipping_total = computedOrder.shipping_total;
		// orderEdit.subtotal = computedOrder.subtotal;
		// orderEdit.tax_total = computedOrder.tax_total;
		// orderEdit.total = computedOrder.total;
		// orderEdit.difference_due = computedOrder.total - order.total;

		return orderEdit;
	}

	async addLineItemSupplierOrderEdit(
		orderEditId: string,
		data: AddOrderEditLineItemInput
	): Promise<void> {
		return await this.atomicPhase_(async (manager) => {
			const lineItemServiceTx = this.lineItemService_.withTransaction(manager);

			const orderEdit = await this.retrieveSupplierOrderEdit(orderEditId, {
				relations: ['supplier_order'],
			});

			const supplierOrder = await this.supplierOrderService_.retrieve(
				orderEdit.supplier_order_id,
				{
					relations: ['cart', 'cart.region'],
				}
			);

			if (!MyOrderEditService.isOrderEditActive(orderEdit)) {
				throw new MedusaError(
					MedusaError.Types.NOT_ALLOWED,
					`Can not add an item to the edit with status ${orderEdit.status}`
				);
			}

			// const regionId = orderEdit.order.region_id;
			const regionId = supplierOrder.cart.region_id;

			const lineItemData = await lineItemServiceTx.generate(
				data.variant_id,
				regionId,
				data.quantity,
				{
					customer_id: orderEdit.order.customer_id,
					metadata: data.metadata,
					order_edit_id: orderEditId,
					unit_price: data.unit_price,
				}
			);

			let lineItem = await lineItemServiceTx.create(lineItemData);
			lineItem = await lineItemServiceTx.retrieve(lineItem.id, {
				relations: ['variant', 'variant.product'],
			});

			await this.refreshAdjustments(orderEditId);

			/**
			 * Generate a change record
			 */
			await this.orderEditItemChangeService_.withTransaction(manager).create({
				type: OrderEditItemChangeType.ITEM_ADD,
				line_item_id: lineItem.id,
				order_edit_id: orderEditId,
			});
		});
	}

	async deleteItemChangeSupplierOrderEdit(
		orderEditId: string,
		itemChangeId: string
	): Promise<void> {
		return await this.atomicPhase_(async (manager) => {
			const itemChange = await this.orderEditItemChangeService_.retrieve(
				itemChangeId,
				{ select: ['id', 'order_edit_id'] }
			);

			const orderEdit = await this.retrieveSupplierOrderEdit(orderEditId, {
				select: ['id', 'confirmed_at', 'canceled_at'],
			});

			if (orderEdit.id !== itemChange.order_edit_id) {
				throw new MedusaError(
					MedusaError.Types.INVALID_DATA,
					`The item change you are trying to delete doesn't belong to the OrderEdit with id: ${orderEditId}.`
				);
			}

			if (orderEdit.confirmed_at !== null || orderEdit.canceled_at !== null) {
				throw new MedusaError(
					MedusaError.Types.NOT_ALLOWED,
					`Cannot delete and item change from a ${orderEdit.status} order edit`
				);
			}

			return await this.orderEditItemChangeService_.delete(itemChangeId);
		});
	}

	async requestConfirmation(
		orderEditId: string,
		context: {
			requestedBy?: string;
		} = {}
	): Promise<OrderEdit> {
		return await this.atomicPhase_(async (manager) => {
			const orderEditRepo = manager.withRepository(this.orderEditRepository_);

			let orderEdit = await this.retrieveSupplierOrderEdit(orderEditId, {
				relations: [
					'changes',
					'changes.original_line_item',
					'changes.original_line_item.variant',
				],
				select: ['id', 'order_id', 'requested_at'],
			});

			if (!orderEdit.changes?.length) {
				throw new MedusaError(
					MedusaError.Types.INVALID_DATA,
					'Cannot request a confirmation on an edit with no changes'
				);
			}

			if (orderEdit.requested_at) {
				return orderEdit;
			}

			orderEdit.requested_at = new Date();
			orderEdit.requested_by = context.requestedBy;

			orderEdit = await orderEditRepo.save(orderEdit);

			await this.eventBusService_
				.withTransaction(manager)
				.emit(MyOrderEditService.Events.S_REQUESTED, { id: orderEditId });

			return orderEdit;
		});
	}

	async cancelSupplierOrderEdit(
		orderEditId: string,
		context: { canceledBy?: string } = {}
	): Promise<OrderEdit> {
		return await this.atomicPhase_(async (manager) => {
			const orderEditRepository = manager.withRepository(
				this.orderEditRepository_
			);

			const orderEdit = await this.retrieveSupplierOrderEdit(orderEditId);

			if (orderEdit.status === OrderEditStatus.CANCELED) {
				return orderEdit;
			}

			if (
				[OrderEditStatus.CONFIRMED, OrderEditStatus.DECLINED].includes(
					orderEdit.status
				)
			) {
				throw new MedusaError(
					MedusaError.Types.NOT_ALLOWED,
					`Cannot cancel order edit with status ${orderEdit.status}`
				);
			}

			orderEdit.canceled_at = new Date();
			orderEdit.canceled_by = context.canceledBy;

			const saved = await orderEditRepository.save(orderEdit);

			await this.eventBusService_
				.withTransaction(manager)
				.emit(MyOrderEditService.Events.S_CANCELED, { id: orderEditId });

			return saved;
		});
	}

	async confirmSupplierOrderEdit(
		orderEditId: string,
		context: { confirmedBy?: string } = {}
	): Promise<OrderEdit> {
		return await this.atomicPhase_(async (manager) => {
			const orderEditRepository = manager.withRepository(
				this.orderEditRepository_
			);

			let orderEdit = await this.retrieveSupplierOrderEdit(orderEditId);

			if (
				[OrderEditStatus.CANCELED, OrderEditStatus.DECLINED].includes(
					orderEdit.status
				)
			) {
				throw new MedusaError(
					MedusaError.Types.NOT_ALLOWED,
					`Cannot confirm an order edit with status ${orderEdit.status}`
				);
			}

			if (orderEdit.status === OrderEditStatus.CONFIRMED) {
				return orderEdit;
			}

			const lineItemServiceTx = this.lineItemService_.withTransaction(manager);

			const [lineItems] = await Promise.all([
				lineItemServiceTx.update(
					{
						supplier_order_id: orderEdit.supplier_order_id,
					} as any,
					{ order_id: null }
				),
				lineItemServiceTx.update({ order_edit_id: orderEditId }, {
					supplier_order_id: orderEdit.supplier_order_id,
				} as any),
			]);

			orderEdit.confirmed_at = new Date();
			orderEdit.confirmed_by = context.confirmedBy;

			orderEdit = await orderEditRepository.save(orderEdit);

			if (this.inventoryService_) {
				await Promise.all(
					lineItems.map(
						async (lineItem) =>
							await this.inventoryService_!.deleteReservationItemsByLineItem(
								lineItem.id
							)
					)
				);
			}

			await this.eventBusService_
				.withTransaction(manager)
				.emit(MyOrderEditService.Events.S_CONFIRMED, { id: orderEditId });

			return orderEdit;
		});
	}

	protected async retrieveActiveSupplierOrderEdit(
		supplierOrderId: string,
		config: FindConfig<OrderEdit> = {}
	): Promise<OrderEdit | undefined | null> {
		const orderEditRepository = this.activeManager_.withRepository(
			this.orderEditRepository_
		);

		const query = buildQuery(
			{
				id: supplierOrderId,
				confirmed_at: IsNull(),
				canceled_at: IsNull(),
				declined_at: IsNull(),
			},
			config
		);

		return await orderEditRepository.findOne(query);
	}

	protected async deleteClonedItems(orderEditId: string): Promise<void> {
		const lineItemServiceTx = this.lineItemService_.withTransaction(
			this.activeManager_
		);
		const lineItemAdjustmentServiceTx =
			this.lineItemAdjustmentService_.withTransaction(this.activeManager_);
		const taxProviderServiceTs = this.taxProviderService_.withTransaction(
			this.activeManager_
		);

		const clonedLineItems = await lineItemServiceTx.list(
			{
				order_edit_id: orderEditId,
			},
			{
				select: ['id', 'tax_lines', 'adjustments'],
				relations: ['tax_lines', 'adjustments'],
			}
		);
		const clonedItemIds = clonedLineItems.map((item) => item.id);

		const orderEdit = await this.retrieveSupplierOrderEdit(orderEditId, {
			select: ['id', 'changes'],
			relations: [
				'changes',
				'changes.original_line_item',
				'changes.original_line_item.variant',
			],
		});

		if (!orderEdit.changes || orderEdit.changes.length === 0) {
			console.log('No changes to delete for order edit:', orderEditId);
			return;
		}

		await this.orderEditItemChangeService_.delete(
			orderEdit.changes.map((change) => change.id)
		);


		await Promise.all(
			[
				taxProviderServiceTs.clearLineItemsTaxLines(clonedItemIds),
				clonedItemIds.map(async (id) => {
					return await lineItemAdjustmentServiceTx.delete({
						item_id: id,
					});
				}),
			].flat()
		);


		await Promise.all(
			clonedItemIds.map(async (id) => {
				return await lineItemServiceTx.delete(id);
			})
		);
	}

	private static isOrderEditActive(orderEdit: OrderEdit): boolean {
		return !(
			orderEdit.status === OrderEditStatus.CONFIRMED ||
			orderEdit.status === OrderEditStatus.CANCELED ||
			orderEdit.status === OrderEditStatus.DECLINED
		);
	}
}
