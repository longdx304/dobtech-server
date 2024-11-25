import { InventoryTransaction } from 'src/models/inventory-transaction';

export type CreateInventoryTransaction = Partial<InventoryTransaction> & {
	unit_id?: string;
	line_item_id?: string;
	variant_id?: string;
	warehouse_inventory_id?: string;
};

export type UpdateInventoryTransaction = Partial<CreateInventoryTransaction>;
