import {
	OrderEditService as MedusaOrderEditService,
	Order,
	OrderEdit,
	OrderEditItemChangeType,
	OrderEditStatus,
	PricingService,
} from '@medusajs/medusa';
import { MedusaError, promiseAll } from '@medusajs/utils';
import { EntityManager, IsNull, Not } from 'typeorm';
import PriceListService from './price-list';
import MyPaymentService from './my-payment';

type InjectedDependencies = {
	manager: EntityManager;
	pricingService: PricingService;
	priceListService: PriceListService;
	myPaymentService: MyPaymentService;
};

class OrderEditService extends MedusaOrderEditService {
	static readonly Events = {
		...MedusaOrderEditService.Events,
		LINEITEM_UPDATED: 'order_edit.line_item_updated',
	};

	protected readonly pricingService_: PricingService;
	protected readonly priceListService_: PriceListService;
	protected readonly myPaymentService_: MyPaymentService;

	constructor({
		pricingService,
		priceListService,
		myPaymentService,
	}: InjectedDependencies) {
		// eslint-disable-next-line prefer-rest-params
		super(arguments[0]);
		this.pricingService_ = pricingService;
		this.priceListService_ = priceListService;
		this.myPaymentService_ = myPaymentService;
	}

	/**
	 * Create or update order edit item change line item and apply the quantity
	 * - If the item change already exists then update the quantity of the line item as well as the line adjustments
	 * - If the item change does not exist then create the item change of type update and apply the quantity as well as update the line adjustments
	 * @param orderEditId
	 * @param itemId
	 * @param data
	 */
	async updateLineItem(
		orderEditId: string,
		itemId: string,
		data: { quantity: number; unit_price?: number }
	): Promise<void> {
		return await this.atomicPhase_(async (manager) => {
			const orderEdit = await this.retrieve(orderEditId, {
				select: [
					'id',
					'order_id',
					'created_at',
					'requested_at',
					'confirmed_at',
					'declined_at',
					'canceled_at',
				],
			});

			const isOrderEditActive =
				OrderEditService.isOrderEditActiveCustom(orderEdit);
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
				unit_price: data?.unit_price ?? lineItem.unit_price,
			});

			await this.refreshAdjustments(orderEditId, {
				preserveCustomAdjustments: true,
			});
		});
	}

	protected async refreshPayment(
		paymentId: string,
		amount: number
	): Promise<void> {
		const myPaymentServiceTx = this.myPaymentService_.withTransaction(
			this.activeManager_
		);

		try {
			await myPaymentServiceTx.updateAmountPayment(paymentId, amount);
		} catch (error) {
			throw new MedusaError(
				MedusaError.Types.INVALID_DATA,
				`Failed to update payment with id ${paymentId}`
			);
		}
	}

	/**
	 * Updates the private price for a customer based on the changes in an order edit.
	 *
	 * @param manager - The transaction manager to use for database operations.
	 * @param orderEditId - The ID of the order edit to process.
	 * @returns A promise that resolves when the operation is complete.
	 *
	 * This method performs the following steps:
	 * 1. Retrieves the order edit and its related changes.
	 * 2. Finds the item update change in the order edit.
	 * 3. Retrieves the customer, currency code, and payment details of the order.
	 * 4. Updates the payment amount based on the total order amount.
	 * 5. Retrieves the pricing of the product variant for the customer.
	 * 6. Inserts or updates the private price of the customer if certain conditions are met.
	 */
	protected async customerPrivatePrice(orderEditId: string): Promise<void> {
		const orderServiceTx = this.orderService_.withTransaction(
			this.activeManager_
		);
		const pricingServiceTx = this.pricingService_.withTransaction(
			this.activeManager_
		);
		const priceListServiceTx = this.priceListService_.withTransaction(
			this.activeManager_
		);

		// Retrieve the order edit
		const orderEdit = await this.retrieve(orderEditId, {
			relations: [
				'changes',
				'changes.line_item',
				'changes.original_line_item',
				'changes.original_line_item.variant',
			],
		});

		// Get the customer, currency code of the order
		const {
			customer_id,
			customer,
			currency_code,
			payments,
			total,
		}: Order = await orderServiceTx.retrieveWithTotals(orderEdit.order_id, {
			relations: ['customer', 'payments'],
		});

		// Update the payment amount
		await this.refreshPayment(payments[0].id, total);

		// Find the item update change
		const changeItem = orderEdit.changes.find((change) => {
			return change.type === 'item_update';
		});

		if (!changeItem) {
			return;
		}

		// Get the pricing of the product variant
		const pricingItem = await pricingServiceTx.getProductVariantPricing(
			{
				id: changeItem.line_item.variant_id,
				product_id: changeItem.line_item.product_id,
			},
			{
				customer_id,
				currency_code,
			}
		);

		// Insert or Update the private price of the
		// customer based on the calculated price
		if (
			customer_id &&
			pricingItem &&
			pricingItem.calculated_price_type !== 'sale' &&
			changeItem.line_item.unit_price < pricingItem.calculated_price
		) {
			const upsertPriceListInput = {
				currency_code: currency_code,
				amount: changeItem.line_item.unit_price,
				variant_id: changeItem.line_item.variant_id,
			};
			await priceListServiceTx.upsertPrivatePriceList(
				{
					id: customer_id,
					name: `${customer?.last_name} ${customer?.first_name}`,
				},
				upsertPriceListInput
			);
		}
	}

	/**
	 * Confirms an order edit by updating its status and performing necessary updates on related entities.
	 *
	 * @param {string} orderEditId - The ID of the order edit to confirm.
	 * @param {Object} context - Additional context for the confirmation.
	 * @param {string} [context.confirmedBy] - The identifier of the user who confirmed the order edit.
	 *
	 * @returns {Promise<OrderEdit>} The confirmed order edit.
	 *
	 * @throws {MedusaError} If the order edit has a status of CANCELED or DECLINED.
	 */
	async confirm(
		orderEditId: string,
		context: { confirmedBy?: string } = {}
	): Promise<OrderEdit> {
		return await this.atomicPhase_(async (manager) => {
			const orderEditRepository = manager.withRepository(
				this.orderEditRepository_
			);

			let orderEdit = await this.retrieve(orderEditId);

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

			const [originalOrderLineItems] = await promiseAll([
				lineItemServiceTx.update(
					[
						{ order_id: orderEdit.order_id, order_edit_id: Not(orderEditId) },
						{ order_id: orderEdit.order_id, order_edit_id: IsNull() },
					],
					{ order_id: null }
				),
				lineItemServiceTx.update(
					{ order_edit_id: orderEditId },
					{ order_id: orderEdit.order_id }
				),
			]);

			orderEdit.confirmed_at = new Date();
			orderEdit.confirmed_by = context.confirmedBy;

			orderEdit = await orderEditRepository.save(orderEdit);

			if (this.inventoryService_) {
				const itemsIds = originalOrderLineItems.map((i) => i.id);
				await this.inventoryService_!.deleteReservationItemsByLineItem(
					itemsIds,
					{
						transactionManager: manager,
					}
				);
			}

			await this.customerPrivatePrice(orderEditId);
			await this.eventBusService_
				.withTransaction(manager)
				.emit(OrderEditService.Events.CONFIRMED, { id: orderEditId });

			return orderEdit;
		});
	}

	private static isOrderEditActiveCustom(orderEdit: OrderEdit): boolean {
		return !(
			orderEdit.status === OrderEditStatus.CONFIRMED ||
			orderEdit.status === OrderEditStatus.CANCELED ||
			orderEdit.status === OrderEditStatus.DECLINED
		);
	}
}

export default OrderEditService;
