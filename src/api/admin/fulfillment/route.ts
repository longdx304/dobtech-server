import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/medusa';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import MyFulfillmentService from 'src/services/my-fulfillment';
import { AdminListFulfillmentsSelector } from '../../../types/fulfillment';
import { transformQuery } from '../../../utils/transform-query';

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
		listConfig
	);

	return res.status(200).json({
		fulfillments: fulfillment,
		count,
		offset: listConfig.skip,
		limit: listConfig.take,
	});
}

/**
 * Parameters used to filter and configure the pagination of the retrieved orders.
 */
export class AdminFulfillmentParams extends AdminListFulfillmentsSelector {
	/**
	 * {@inheritDoc FindPaginationParams.offset}
	 * @defaultValue 0
	 */
	@IsNumber()
	@IsOptional()
	@Type(() => Number)
	offset = 0;

	/**
	 * {@inheritDoc FindPaginationParams.limit}
	 * @defaultValue 50
	 */
	@IsNumber()
	@IsOptional()
	@Type(() => Number)
	limit = 50;

	/**
	 * {@inheritDoc FindParams.expand}
	 */
	@IsString()
	@IsOptional()
	expand?: string;

	/**
	 * {@inheritDoc FindParams.fields}
	 */
	@IsString()
	@IsOptional()
	fields?: string;

	/**
	 * The field to sort retrieved orders by. By default, the sort order is ascending.
	 * To change the order to descending, prefix the field name with `-`.
	 */
	@IsOptional()
	@IsString()
	order?: string;
}
