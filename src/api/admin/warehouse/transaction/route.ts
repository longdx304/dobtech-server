import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/medusa';
import InventoryTransactionService from 'src/services/inventory-transaction';

export async function GET(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const inventoryTransactionService: InventoryTransactionService =
		req.scope.resolve('inventoryTransactionService');

	const { quantity, start_at, end_at, note, q } = req.query;

	const selector: any = {};

	if (quantity) {
		selector.quantity = Number(quantity);
	}
	if (start_at) {
		selector.start_at = new Date(start_at as string);
	}
	if (end_at) {
		selector.end_at = new Date(end_at as string);
	}
	if (note) {
		selector.note = note;
	}

	if (q) {
		selector.q = q;
	}

	const [inventoryTransactions, count] =
		await inventoryTransactionService.listAndCount(selector);
	return res.status(200).json({ inventoryTransactions, count });
}
