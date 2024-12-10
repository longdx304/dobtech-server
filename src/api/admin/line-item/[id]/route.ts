import {
	AuthenticatedMedusaRequest,
	LineItemService,
	MedusaResponse,
} from '@medusajs/medusa';

export async function GET(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const lineItemService: LineItemService = req.scope.resolve('lineItemService');
	const { id } = req.params;

	const lineItem = await lineItemService.retrieve(id);
	res.status(200).json({ lineItem });
}
