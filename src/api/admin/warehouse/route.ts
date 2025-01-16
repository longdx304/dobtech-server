import {
	DateComparisonOperator,
	extendedFindParamsMixin,
	IsType,
	type AuthenticatedMedusaRequest,
	type MedusaResponse,
} from '@medusajs/medusa';
import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import WarehouseService from 'src/services/warehouse';
import { Warehouse } from '../../../models/warehouse';
import { transformQuery } from '../../../utils/transform-query';

export async function GET(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const warehouseService: WarehouseService =
		req.scope.resolve('warehouseService');

	const { filterableFields, listConfig } = await transformQuery(
		AdminGetWarehousesParams,
		req.query,
		{
			isList: true,
		}
	);
	console.log("filterableFields, listConfig:", filterableFields, listConfig)

	const [warehouse, count] = await warehouseService.listAndCount(
		filterableFields,
		listConfig
	);

	return res.status(200).json({
		warehouse,
		count,
		offset: listConfig.skip,
		limit: listConfig.take,
	});
}

export async function POST(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const warehouseService: WarehouseService =
		req.scope.resolve('warehouseService');

	const data = (await req.body) as Partial<Warehouse>;

	const warehouse = await warehouseService.create(data);
	return res.status(200).json({ warehouse });
}

export class AdminGetWarehousesParams extends extendedFindParamsMixin({
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
	 * IDs to filter users by.
	 */
	@IsOptional()
	@IsType([String, [String]])
	id?: string | string[];

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

	/**
	 * Date filters to apply on the users' `update_at` date.
	 */
	@IsOptional()
	@ValidateNested()
	@Type(() => DateComparisonOperator)
	updated_at?: DateComparisonOperator;

	/**
	 * Date filters to apply on the customer users' `created_at` date.
	 */
	@IsOptional()
	@ValidateNested()
	@Type(() => DateComparisonOperator)
	created_at?: DateComparisonOperator;

	/**
	 * Filter to apply on the users' `email` field.
	 */
	@IsOptional()
	@IsString()
	location?: string;

	/**
	 * Filter to apply on the users' `first_name` field.
	 */
	@IsOptional()
	@IsString()
	capacity?: number;

	/**
	 * Comma-separated fields that should be included in the returned users.
	 */
	@IsOptional()
	@IsString()
	fields?: string;
}

export const AUTHENTICATE = false;
