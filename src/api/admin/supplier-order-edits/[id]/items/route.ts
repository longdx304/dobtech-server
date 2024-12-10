import { MedusaRequest, MedusaResponse } from '@medusajs/medusa';
import MyOrderEditService from 'src/services/my-order-edit';
import { AddOrderEditLineItemInput } from 'src/types/my-order-edits';
import {
	defaultOrderEditFields,
	defaultOrderEditRelations,
} from '../../../../../types/my-order-edits';
import { EntityManager } from 'typeorm';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const myOrderEditService: MyOrderEditService =
		req.scope.resolve('myOrderEditService');
	const manager: EntityManager = req.scope.resolve('manager');

	const { id } = req.params;
	const data = req.body as AddOrderEditLineItemInput;

	await manager.transaction(async (transactionManager) => {
		await myOrderEditService
			.withTransaction(transactionManager)
			.addLineItemSupplierOrderEdit(id, data);
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
