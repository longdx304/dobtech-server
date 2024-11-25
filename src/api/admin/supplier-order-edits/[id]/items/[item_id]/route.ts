import { MedusaRequest, MedusaResponse } from '@medusajs/medusa';
import MyOrderEditService from 'src/services/my-order-edit';
import { EntityManager } from 'typeorm';
import {
	defaultOrderEditFields,
	defaultOrderEditRelations,
} from '../../../../../../types/my-order-edits';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const myOrderEditService: MyOrderEditService =
		req.scope.resolve('myOrderEditService');
	const manager: EntityManager = req.scope.resolve('manager');

	const { id, item_id } = req.params;

	const body = req.body as any;

	const decoratedEdit = await manager.transaction(
		async (transactionManager) => {
			const orderEditTx =
				myOrderEditService.withTransaction(transactionManager);

			await orderEditTx.updateLineItemSupplierOrderEdit(id, item_id, body);

			const orderEdit = await orderEditTx.retrieveSupplierOrderEdit(id, {
				relations: defaultOrderEditRelations,
				select: defaultOrderEditFields,
			} as any);

			await orderEditTx.decorateTotalsSupplierOrderEdit(orderEdit);

			return orderEdit;
		}
	);

	res.status(200).send({
		order_edit: decoratedEdit,
	});
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
	const myOrderEditService: MyOrderEditService =
		req.scope.resolve('myOrderEditService');
	const manager: EntityManager = req.scope.resolve('manager');

	const { id, item_id } = req.params;

	await manager.transaction(async (transactionManager) => {
		await myOrderEditService
			.withTransaction(transactionManager)
			.removeLineItemSupplierOrderEdit(id, item_id);
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
