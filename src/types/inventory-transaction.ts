import { InventoryTransaction } from 'src/models/inventory-transaction';

export type CreateInventoryTransaction = Partial<InventoryTransaction> & {
	unit_id?: string;
};

export type UpdateInventoryTransaction = Partial<CreateInventoryTransaction>;
