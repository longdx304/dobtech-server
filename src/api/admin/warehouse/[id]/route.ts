import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/medusa';
import WarehouseService from 'src/services/warehouse';

export async function GET(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const warehouseService: WarehouseService =
		req.scope.resolve('warehouseService');
	const { id } = req.params;

	const warehouse = await warehouseService.retrieve(id);
	return res.status(200).json({ warehouse });
}

export async function DELETE(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const warehouseService: WarehouseService =
		req.scope.resolve('warehouseService');
	const { id } = req.params;

	await warehouseService.delete(id);
	return res.status(200).json({
		id,
		object: 'warehouse',
		deleted: true,
	});
}
