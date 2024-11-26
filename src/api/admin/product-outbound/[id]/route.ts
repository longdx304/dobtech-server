import {
	cleanResponseData,
	MedusaRequest,
	MedusaResponse,
	Order,
} from '@medusajs/medusa';
import ProductOutboundService from 'src/services/product-outbound';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
	const productOutboundService: ProductOutboundService = req.scope.resolve(
		'productOutboundService'
	);

	const { id } = req.params;

	let order: Partial<Order> = await productOutboundService.retrieveWithTotals(
		id,
		req.retrieveConfig,
		{
			includes: req.includes,
		}
	);

	order = cleanResponseData(order, req.allowedProperties);

	res.json({ order: cleanResponseData(order, []) });
}
