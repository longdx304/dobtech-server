import {
	OrderEditService as MedusaOrderEditService,
	OrderEdit,
	OrderEditItemChangeType,
	OrderEditStatus,
} from '@medusajs/medusa';
import { MedusaError } from '@medusajs/utils';
import { EntityManager } from 'typeorm';

type InjectedDependencies = {
	manager: EntityManager;
};

class OrderEditService extends MedusaOrderEditService {
	static readonly Events = {
		...MedusaOrderEditService.Events,
		LINEITEM_UPDATED: 'order_edit.line_item_updated',
	};
	constructor({}: InjectedDependencies) {
		// eslint-disable-next-line prefer-rest-params
		super(arguments[0]);
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

	private static isOrderEditActiveCustom(orderEdit: OrderEdit): boolean {
		return !(
			orderEdit.status === OrderEditStatus.CONFIRMED ||
			orderEdit.status === OrderEditStatus.CANCELED ||
			orderEdit.status === OrderEditStatus.DECLINED
		);
	}
}

export default OrderEditService;
