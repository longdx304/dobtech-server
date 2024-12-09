import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/medusa';
import WarehouseService from 'src/services/warehouse';
import { AdminPostWarehouseVariantReq } from '../../../../types/warehouse';

export async function POST(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const warehouseService: WarehouseService =
		req.scope.resolve('warehouseService');

	const data = (await req.body) as AdminPostWarehouseVariantReq;

	const warehouse = await warehouseService.createWarehouseWithVariant(
		data.warehouse
	);
	return res.status(200).json({ warehouse });
}
