import { MedusaRequest, MedusaResponse } from '@medusajs/medusa';
import MyOrderEditService from 'src/services/my-order-edit';
import { EntityManager } from 'typeorm';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const myOrderEditService: MyOrderEditService =
		req.scope.resolve('myOrderEditService');
	const manager: EntityManager = req.scope.resolve('manager');

	const { id, item_id } = req.params;

	const validatedBody = req.validatedBody as any;

	try {
		const decoratedEdit = await manager.transaction(
			async (transactionManager) => {
				const orderEditTx =
					myOrderEditService.withTransaction(transactionManager);

				await orderEditTx.updateLineItemSupplierOrderEdit(
					id,
					item_id,
					validatedBody
				);

				const orderEdit = await orderEditTx.retrieveSupplierOrderEdit(id, {});

				await orderEditTx.decorateTotalsSupplierOrderEdit(orderEdit);

				return orderEdit;
			}
		);

		res.status(200).send({
			order_edit: decoratedEdit,
		});
	} catch (error) {
		res.status(400).send({
			message: error.message,
		});
	}
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
	const myOrderEditService: MyOrderEditService =
		req.scope.resolve('myOrderEditService');
	const manager: EntityManager = req.scope.resolve('manager');

	const { id, item_id } = req.params;

	try {
		await manager.transaction(async (transactionManager) => {
			await myOrderEditService
				.withTransaction(transactionManager)
				.removeLineItemSupplierOrderEdit(id, item_id);
		});

		let orderEdit = await myOrderEditService.retrieveSupplierOrderEdit(id, {
			// select: defaultOrderEditFields,
			// relations: defaultOrderEditRelations,
		});
		orderEdit = await myOrderEditService.decorateTotalsSupplierOrderEdit(
			orderEdit
		);

		res.status(200).send({
			order_edit: orderEdit,
		});
	} catch (error) {
		res.status(400).send({
			message: error.message,
		});
	}
}
