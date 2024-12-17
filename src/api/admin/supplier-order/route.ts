import {
	cleanResponseData,
	type MedusaRequest,
	type MedusaResponse,
} from '@medusajs/medusa';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import SupplierOrderService from 'src/services/supplier-order';
import {
	AdminListSupplierOrdersSelector,
	CreateSupplierOrderInput,
} from '../../../types/supplier-orders';
import { transformQuery } from '../../../utils/transform-query';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
	const supplierOrderService: SupplierOrderService = req.scope.resolve(
		'supplierOrderService'
	);

	const { filterableFields, listConfig } = await transformQuery(
		AdminGetSupplierOrdersParams,
		req.query,
		{
			isList: true,
		}
	);

	const [supplierOrder, count] = await supplierOrderService.listAndCount(
		filterableFields as any,
		listConfig
	);

	return res.status(200).json({
		supplierOrders: cleanResponseData(supplierOrder, []),
		count,
		offset: listConfig.skip,
		limit: listConfig.take,
	});
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const supplierOrderService: SupplierOrderService = req.scope.resolve(
		'supplierOrderService'
	);
	const data = await req.body;

	const supplierOrder = await supplierOrderService.create(
		data as CreateSupplierOrderInput
	);
	return res.status(200).json({ supplierOrder });
}

/**
 * Parameters used to filter and configure the pagination of the retrieved orders.
 */
export class AdminGetSupplierOrdersParams extends AdminListSupplierOrdersSelector {
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
