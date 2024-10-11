import { OrderEdit } from './../models/order-edit';
import { dataSource } from '@medusajs/medusa/dist/loaders/database';

const OrderEditRepository = dataSource.getRepository(OrderEdit);

export default OrderEditRepository;
