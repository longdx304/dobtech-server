import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/medusa';
import MyFulfillmentService from 'src/services/my-fulfillment';
import { transformQuery } from '../../../../utils/transform-query';
import { AdminFulfillmentParams } from '../route';

export async function GET(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const myFulfillmentService: MyFulfillmentService = req.scope.resolve(
		'myFulfillmentService'
	);

	const { filterableFields, listConfig } = await transformQuery(
		AdminFulfillmentParams,
		req.query,
		{
			isList: true,
		}
	);

	const [fulfillment, count] = await myFulfillmentService.listAndCount(
		filterableFields as any,
		listConfig,
		true
	);

	return res.status(200).json({
		fulfillments: fulfillment,
		count,
		offset: listConfig.skip,
		limit: listConfig.take,
	});
}
