import {
	AuthenticatedMedusaRequest,
	cleanResponseData,
	MedusaResponse,
} from '@medusajs/medusa';
import { Fulfillment } from 'src/models/fulfillment';
import MyFulfillmentService from 'src/services/my-fulfillment';
import { UpdateFulfillment } from 'src/types/fulfillment';

export async function GET(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const myFulfillmentService: MyFulfillmentService = req.scope.resolve(
		'myFulfillmentService'
	);

	const { id } = req.params;
	console.log('req.retrieveConfig', req.retrieveConfig);
	let fulfillment: Partial<Fulfillment> =
		await myFulfillmentService.retrieveWithTotals(id);

	fulfillment = cleanResponseData(fulfillment, req.allowedProperties);

	res.json({ fulfillment: cleanResponseData(fulfillment, []) });
}

export async function POST(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const myFulfillmentService: MyFulfillmentService = req.scope.resolve(
		'myFulfillmentService'
	);

	const { id } = req.params;

	const data = (await req.body) as UpdateFulfillment;
	const userId = (req.user?.id ?? req.user?.userId) as string;

	const fulfillment = await myFulfillmentService.updateFulfillment(
		userId,
		id,
		data
	);

	return res.status(200).json({ fulfillment });
}
