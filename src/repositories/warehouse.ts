import { dataSource } from '@medusajs/medusa/dist/loaders/database';
import { Warehouse } from './../models/warehouse';

const WarehouseRepository = dataSource.getRepository(Warehouse);

export default WarehouseRepository;
