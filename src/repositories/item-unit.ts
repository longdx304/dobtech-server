import { dataSource } from "@medusajs/medusa/dist/loaders/database";
import { ItemUnit } from '../models/item-unit';

const ItemUnitRepository = dataSource.getRepository(ItemUnit);

export default ItemUnitRepository;
