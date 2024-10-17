import { MedusaError } from '@medusajs/utils';
import {
	LineItem,
	LineItemService as MedusaLineItemService,
} from '@medusajs/medusa';
import { DeepPartial, In } from 'typeorm';

export default class MyLineItemService extends MedusaLineItemService {
	async newCloneTo(
		ids: string | string[],
		data: DeepPartial<LineItem> = {},
		options: { setOriginalLineItemId?: boolean } = {
			setOriginalLineItemId: true,
		}
	): Promise<LineItem[]> {
		ids = typeof ids === 'string' ? [ids] : ids;
		return await this.atomicPhase_(async (manager) => {
			let lineItems: DeepPartial<LineItem>[] = await this.list({
				id: In(ids as string[]),
			});

			const lineItemRepository = manager.withRepository(
				this.lineItemRepository_
			);

			const { supplier_order_id, cart_id, order_edit_id, ...lineItemData } =
				data;

			if (!supplier_order_id && !cart_id && !order_edit_id) {
				throw new MedusaError(
					MedusaError.Types.INVALID_DATA,
					'Unable to clone a line item that is not attached to at least one of: order_edit, order, swap, claim or cart.'
				);
			}

			lineItems = lineItems.map((item) => ({
				...item,
				...lineItemData,
				id: undefined,
				supplier_order_id,
				cart_id,
				order_edit_id,
				original_item_id: options?.setOriginalLineItemId ? item.id : undefined,
			}));

			const clonedLineItemEntities = lineItemRepository.create(lineItems);
			return await lineItemRepository.save(clonedLineItemEntities);
		});
	}
}
