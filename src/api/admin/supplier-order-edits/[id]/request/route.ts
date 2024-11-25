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

	const loggedInUser = (req.user?.id ?? req.user?.userId) as string;
	await manager.transaction(async (transactionManager) => {
		const orderEditServiceTx =
			myOrderEditService.withTransaction(transactionManager);

		const orderEdit = await orderEditServiceTx.requestConfirmation(id, {
			requestedBy: loggedInUser,
		});

		const total = await orderEditServiceTx.decorateTotalsSupplierOrderEdit(
			orderEdit
		);
	});
	let orderEdit = await myOrderEditService.retrieveSupplierOrderEdit(id, {
		relations: defaultOrderEditRelations,
		select: defaultOrderEditFields,
	} as any);
	orderEdit = await myOrderEditService.decorateTotalsSupplierOrderEdit(
		orderEdit
	);

	res.status(200).send({
		order_edit: orderEdit,
	});
}
