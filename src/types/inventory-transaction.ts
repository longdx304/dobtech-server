import { PartialPick, ProductVariant } from '@medusajs/medusa';
import { InventoryTransaction } from 'src/models/inventory-transaction';

export type CreateInventoryTransaction = {
	unit_id: string;
	line_item_id: string;
	variant_id: string;
	warehouse_inventory_id: string;
	quantity: number;
	order_id: string;
	warehouse_id: string;
	type: 'INBOUND' | 'OUTBOUND';
};

export type UpdateInventoryTransaction = Partial<CreateInventoryTransaction>;

export type FilterableVariantProps = PartialPick<
	ProductVariant,
	| 'sku'
>;

export type FilterableInventoryTransactionProps = PartialPick<
	InventoryTransaction,
	| 'warehouse_id'
	| 'order_id'
	| 'variant_id'
	| 'warehouse'
	| 'note'
	| 'quantity'
	| 'user_id'
> & {
	variant: FilterableVariantProps;
	q?: string;
};