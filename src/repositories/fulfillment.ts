import { dataSource } from "@medusajs/medusa/dist/loaders/database";
import { Fulfillment } from "../models/fulfillment";

const FulfillmentRepository = dataSource.getRepository(Fulfillment);

export default FulfillmentRepository;
