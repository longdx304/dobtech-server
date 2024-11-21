import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/medusa';
import WarehouseInventoryService from 'src/services/warehouse-inventory';

export async function GET(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const warehouseInventoryService: WarehouseInventoryService =
		req.scope.resolve('warehouseInventoryService');
	const { id } = req.params;

	try {
		const warehouseInventory = await warehouseInventoryService.getByVariant(id);
		return res.status(200).json({ warehouseInventory });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
}
