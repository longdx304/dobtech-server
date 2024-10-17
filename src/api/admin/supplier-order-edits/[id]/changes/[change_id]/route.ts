import { MedusaRequest, MedusaResponse } from '@medusajs/medusa';
import MyOrderEditService from 'src/services/my-order-edit';
import { EntityManager } from 'typeorm';

export async function DELETE(
	req: MedusaRequest,
	res: MedusaResponse
): Promise<void> {
	const myOrderEditService: MyOrderEditService =
		req.scope.resolve('myOrderEditService');
	const manager: EntityManager = req.scope.resolve('manager');

	const { id, change_id } = req.params;

	try {
		await manager.transaction(async (transactionManager) => {
			await myOrderEditService
				.withTransaction(transactionManager)
				.deleteItemChangeSupplierOrderEdit(id, change_id);
		});
		res.status(200).send({
			id: change_id,
			object: 'item_change',
			deleted: true,
		});
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
}
