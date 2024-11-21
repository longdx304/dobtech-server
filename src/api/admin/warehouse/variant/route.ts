import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/medusa';
import WarehouseService from 'src/services/warehouse';
import { CreateWarehouseWithVariant } from '../../../../types/warehouse';

export async function POST(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const warehouseService: WarehouseService =
		req.scope.resolve('warehouseService');

	const data = (await req.body) as CreateWarehouseWithVariant;

	try {
		const warehouse = await warehouseService.createWithVariants(data);
		return res.status(200).json({ warehouse });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
}
