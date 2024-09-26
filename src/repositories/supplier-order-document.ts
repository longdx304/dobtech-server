import { dataSource } from "@medusajs/medusa/dist/loaders/database";
import { SupplierOrderDocument } from "../models/supplier-order-document";

const SupplierOrderDocumentRepository = dataSource.getRepository(SupplierOrderDocument);

export default SupplierOrderDocumentRepository;
