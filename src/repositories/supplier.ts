import { dataSource } from "@medusajs/medusa/dist/loaders/database";
import { Supplier } from "../models/supplier";

const SupplierRepository = dataSource.getRepository(Supplier);

export default SupplierRepository;
