import { dataSource } from '@medusajs/medusa/dist/loaders/database';
import { InventoryTransaction } from './../models/inventory-transaction';

const InventoryTransactionRepository =
	dataSource.getRepository(InventoryTransaction);

export default InventoryTransactionRepository;
