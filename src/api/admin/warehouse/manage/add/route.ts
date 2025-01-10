import { MedusaError } from '@medusajs/utils';
import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/medusa';
import InventoryTransactionService from 'src/services/inventory-transaction';
import { CreateInventoryTransaction } from 'src/types/inventory-transaction';

export async function POST(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const inventoryTransactionService: InventoryTransactionService =
		req.scope.resolve('inventoryTransactionService');

	const data = (await req.body) as Partial<CreateInventoryTransaction>;

	const user_id = (req.user?.id ?? req.user?.userId) as string;

	if (!user_id) {
		throw new MedusaError(
			MedusaError.Types.INVALID_DATA,
			'Không tìm thấy user_id'
		);
	}

	const inventoryTransaction = await inventoryTransactionService.create({
		...data,
		user_id,
	});
	return res.status(200).json({ inventoryTransaction });
}
