import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/medusa';
import InventoryTransactionService from 'src/services/inventory-transaction';
import { CreateInventoryTransaction } from 'src/types/inventory-transaction';

export async function POST(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const inventoryTransactionService: InventoryTransactionService =
		req.scope.resolve('inventoryTransactionService');

	const data = (await req.body) as CreateInventoryTransaction;

	const inventoryTransaction = await inventoryTransactionService.removeOutbound(
		data
	);
	return res.status(200).json({ inventoryTransaction });
}
