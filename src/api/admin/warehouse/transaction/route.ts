import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/medusa';
import InventoryTransactionService from 'src/services/inventory-transaction';

export async function GET(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const inventoryTransactionService: InventoryTransactionService =
		req.scope.resolve('inventoryTransactionService');

	const { quantity, start_at, end_at, note, q, type } = req.query;

	const selector: any = {};

	if (quantity) {
		selector.quantity = Number(quantity);
	}
	if (start_at) {
		selector.start_at = new Date(start_at as string);
	}
	if (end_at) {
		const endDate = new Date(end_at as string);
		endDate.setHours(23, 59, 59, 999);
		selector.end_at = endDate;
	}
	if (note) {
		selector.note = note;
	}

	if (type) {
		selector.type = type;
	}

	if (q) {
		selector.q = q;
	}

	const [inventoryTransactions, count] =
		await inventoryTransactionService.listAndCount(selector);
	return res.status(200).json({ inventoryTransactions, count });
}
