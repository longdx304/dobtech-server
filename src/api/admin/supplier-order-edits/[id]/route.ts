import { MedusaRequest, MedusaResponse } from '@medusajs/medusa';
import MyOrderEditService from 'src/services/my-order-edit';
import { EntityManager } from 'typeorm';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
	const myOrderEditService: MyOrderEditService =
		req.scope.resolve('myOrderEditService');

	const { id } = req.params;

	const retrieveConfig = req.retrieveConfig;

	try {
		let myOrderEdit = await myOrderEditService.retrieveSupplierOrderEdit(
			id,
			retrieveConfig
		);
		myOrderEdit = await myOrderEditService.decorateTotalsSupplierOrderEdit(
			myOrderEdit
		);

		return res.status(200).json({ order_edit: myOrderEdit });
	} catch (error) {
		return res.status(404).json({ error: error.message });
	}
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
	const myOrderEditService: MyOrderEditService =
		req.scope.resolve('myOrderEditService');
	const manager: EntityManager = req.scope.resolve('manager');
	const orderEditId = req.params.id;
	const data = req.body;

	try {
		const updatedOrderEdit = await manager.transaction(
			async (transactionManager) => {
				return await myOrderEditService
					.withTransaction(transactionManager)
					.updateSupplierOrderEdit(orderEditId, data);
			}
		);

		let orderEdit = await myOrderEditService.retrieveSupplierOrderEdit(
			updatedOrderEdit.id,
			{}
		);
		orderEdit = await myOrderEditService.decorateTotalsSupplierOrderEdit(
			orderEdit
		);

		return res.status(200).json({ order_edit: orderEdit });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
	const myOrderEditService: MyOrderEditService =
		req.scope.resolve('myOrderEditService');
	const manager: EntityManager = req.scope.resolve('manager');

	const { id } = req.params;


	try {
		await manager.transaction(async (transactionManager) => {
			return await myOrderEditService
				.withTransaction(transactionManager)
				.deleteSupplierOrderEdit(id);
		});

		return res.status(204).json({ message: 'Order edit deleted successfully' });
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
}
