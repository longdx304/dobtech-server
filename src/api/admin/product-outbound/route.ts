import {
	AuthenticatedMedusaRequest,
	FulfillmentStatus,
	MedusaResponse,
} from '@medusajs/medusa';
import ProductOutboundService from 'src/services/product-outbound';

export async function GET(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const productOutboundService: ProductOutboundService = req.scope.resolve(
		'productOutboundService'
	);

	const searchParams = req.query;

	const { offset, limit, status } = searchParams;

	const parsedStatuses = status
		? (status as FulfillmentStatus)
		: [FulfillmentStatus.NOT_FULFILLED, FulfillmentStatus.FULFILLED];

	const [orders, count] = await productOutboundService.listAndCount(
		parsedStatuses,
		{
			skip: (offset ?? 0) as number,
			take: (limit ?? 20) as number,
		}
	);

	return res.status(200).json({ orders, count, offset, limit });
}
