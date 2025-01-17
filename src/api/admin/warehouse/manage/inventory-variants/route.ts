import {
	extendedFindParamsMixin,
	type AuthenticatedMedusaRequest,
	type MedusaResponse
} from '@medusajs/medusa';
import { IsOptional, IsString } from 'class-validator';
import WarehouseInventoryService from 'src/services/warehouse-inventory';
import { transformQuery } from '../../../../../utils/transform-query';

export async function GET(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const warehouseInventoryService: WarehouseInventoryService =
		req.scope.resolve('warehouseInventoryService');

	const { filterableFields, listConfig } = await transformQuery(
		AdminGetVariantInventoryParams,
		req.query,
		{
			isList: true,
		}
	);

	const { data } =
		await warehouseInventoryService.listInventoryDifferenceVariants(
			filterableFields,
			listConfig
		);

	return res.status(200).json({
		data,
		offset: listConfig.skip,
		limit: listConfig.take,
	});
}
export class AdminGetVariantInventoryParams extends extendedFindParamsMixin({
	limit: 50,
	offset: 0,
}) {
	/**
	 * {@inheritDoc FindParams.expand}
	 */
	@IsString()
	@IsOptional()
	expand?: string;

	/**
	 * Search terms to search users' first name, last name, and email.
	 */
	@IsOptional()
	@IsString()
	q?: string;

	/**
	 * The field to sort the data by. By default, the sort order is ascending. To change the order to descending, prefix the field name with `-`.
	 */
	@IsString()
	@IsOptional()
	order?: string;
}
