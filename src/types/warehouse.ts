import { PartialPick } from '@medusajs/medusa';
import { Warehouse } from 'src/models/warehouse';

export type CreateWarehouseWithVariant = Partial<Warehouse> & {
	warehouse_id?: string;
	unit_id?: string;
	variant_id: string;
};

export type AdminPostItemInventory = {
	variant_id: string;
	quantity: number;
	unit_id: string;
	line_item_id: string;
	order_id: string;
	type: 'INBOUND' | 'OUTBOUND';
};

type AdminPostWarehouseRes = {
	warehouse_id?: string;
	location: string;
	variant_id: string;
	capacity?: number;
	unit_id: string;
};

export type AdminPostItemData = {
	variant_id: string;
	quantity: number;
	unit_id: string;
	line_item_id: string;
	order_id: string;
	type: string;
};

export interface AdminPostWarehouseVariantReq {
	warehouse: AdminPostWarehouseRes;
	itemInventory: AdminPostItemData;
}
export type FilterableWarehouseProps = PartialPick<Warehouse, 'location'>;
