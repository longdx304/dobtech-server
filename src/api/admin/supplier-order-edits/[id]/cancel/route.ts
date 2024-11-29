import { MedusaRequest, MedusaResponse } from '@medusajs/medusa';
import MyOrderEditService from 'src/services/my-order-edit';
import { EntityManager } from 'typeorm';
import {
	defaultOrderEditFields,
	defaultOrderEditRelations,
} from '../../../../../types/my-order-edits';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const myOrderEditService: MyOrderEditService =
		req.scope.resolve('myOrderEditService');
	const manager: EntityManager = req.scope.resolve('manager');

	const { id } = req.params;

	const userId = req.user?.id ?? req.user?.userId;

	await manager.transaction(async (transactionManager) => {
		await myOrderEditService
			.withTransaction(transactionManager)
			.cancelSupplierOrderEdit(id, { canceledBy: userId });
	});

	let orderEdit = await myOrderEditService.retrieveSupplierOrderEdit(id, {
		relations: defaultOrderEditRelations,
		select: defaultOrderEditFields,
	} as any);
	orderEdit = await myOrderEditService.decorateTotalsSupplierOrderEdit(
		orderEdit
	);

	return res.status(200).json({ order_edit: orderEdit });
}
