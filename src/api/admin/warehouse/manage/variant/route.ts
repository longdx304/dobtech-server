import { MedusaError } from 'medusa-core-utils';
import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/medusa';
import WarehouseService from 'src/services/warehouse';
import {
	AdminPostItemInventory,
	CreateWarehouseWithVariant,
} from 'src/types/warehouse';
import InventoryTransactionService from 'src/services/inventory-transaction';

export async function POST(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const warehouseService: WarehouseService =
		req.scope.resolve('warehouseService');

	const inventoryTransactionService: InventoryTransactionService =
		req.scope.resolve('inventoryTransactionService');

	const { location, variant_id, warehouse_id, quantity, unit_id, type } =
		req.body;

	const user_id = (req.user?.id ?? req.user?.userId) as string;

	// Data for warehouse
	const dataWarehouse: CreateWarehouseWithVariant = {
		warehouse_id,
		variant_id,
		unit_id,
		location,
	};

	// Data for item inventory
	const dataItemInventory: AdminPostItemInventory = {
		variant_id,
		quantity,
		unit_id,
		type,
	};

	if (!user_id) {
		throw new MedusaError(
			MedusaError.Types.INVALID_DATA,
			'Không tìm thấy user_id'
		);
	}

	const { warehouseInventory } = await warehouseService.addVariantIntoWarehouse(
		dataWarehouse,
		dataItemInventory,
		user_id
	);

	await inventoryTransactionService.addInventoryToWarehouse({
		unit_id,
		variant_id,
		warehouse_inventory_id: warehouseInventory.id,
		quantity,
		warehouse_id,
		type: type,
		user_id,
	});
	return res.status(200).json({ success: true });
}
