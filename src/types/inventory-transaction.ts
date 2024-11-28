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
