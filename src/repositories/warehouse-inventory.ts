import { dataSource } from '@medusajs/medusa/dist/loaders/database';
import { WarehouseInventory } from './../models/warehouse-inventory';

const WarehouseInventoryRepository =
	dataSource.getRepository(WarehouseInventory);

export default WarehouseInventoryRepository;
