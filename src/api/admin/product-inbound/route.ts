import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from '@medusajs/medusa';
import ProductInboundService from 'src/services/product-inbound';
import { FulfillSupplierOrderStt } from '../../../models/supplier-order';

export async function GET(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const productInboundService: ProductInboundService = req.scope.resolve(
		'productInboundService'
	);

	const searchParams = req.query;

	const { offset, limit, status } = searchParams;

	const parsedStatuses = status
		? (status as FulfillSupplierOrderStt)
		: [FulfillSupplierOrderStt.DELIVERED, FulfillSupplierOrderStt.INVENTORIED];

	try {
		const [supplierOrder, count] = await productInboundService.listAndCount(
			parsedStatuses,
			{
				skip: (offset ?? 0) as number,
				take: (limit ?? 20) as number,
			}
		);

		return res.status(200).json({ supplierOrder, count, offset, limit });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
}
