import { PartialPick } from '@medusajs/medusa';
import { Warehouse } from 'src/models/warehouse';

export type CreateWarehouseWithVariant = Partial<Warehouse> & {
	warehouse_id?: string;
	variant_id: string;
};

export type FilterableWarehouseProps = PartialPick<Warehouse, 'location'>;
