import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/medusa';
import WarehouseInventoryService from 'src/services/warehouse-inventory';

export async function GET(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const warehouseInventoryService: WarehouseInventoryService =
		req.scope.resolve('warehouseInventoryService');
	const { id } = req.params;

	const warehouseInventory = await warehouseInventoryService.getByVariant(id);
	return res.status(200).json({ warehouseInventory });
}
