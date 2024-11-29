import { MedusaRequest, MedusaResponse } from '@medusajs/medusa';
import MyOrderEditService from 'src/services/my-order-edit';
import { EntityManager } from 'typeorm';
import {
	defaultOrderEditFields,
	defaultOrderEditRelations,
} from '../../../types/my-order-edits';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
	const myOrderEditService: MyOrderEditService =
		req.scope.resolve('myOrderEditService');

	const searchParams = req.query;

	const q = searchParams.q ? String(searchParams.q) : '';
	const supplier_order_id = searchParams.supplier_order_id
		? String(searchParams.supplier_order_id)
		: '';
	const limit = searchParams.limit ? Number(searchParams.limit) : 20;
	const offset = searchParams.offset ? Number(searchParams.offset) : 0;

	const filterableFields = {
		...(q && { q }),
		...(supplier_order_id && { supplier_order_id }),
	};

	const [orderEdits, orderEditCount] = await myOrderEditService.listAndCount(
		filterableFields
	);

	for (let orderEdit of orderEdits) {
		orderEdit = await myOrderEditService.decorateTotalsSupplierOrderEdit(
			orderEdit
		);
	}

	return res.status(200).json({
		edits: orderEdits,
		count: orderEditCount,
		limit: limit,
		offset: offset,
	});
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const myOrderEditService: MyOrderEditService =
		req.scope.resolve('myOrderEditService');

	const manager: EntityManager = req.scope.resolve('manager');

	const data = await req.body;

	const createdBy = (req.user?.id ?? req.user?.userId) as string;

	const createdOrderEdit = await manager.transaction(
		async (transactionManager) => {
			return await myOrderEditService
				.withTransaction(transactionManager)
				.createSupplierOrderEdit(data, { createdBy });
		}
	);

	let orderEdit = await myOrderEditService.retrieveSupplierOrderEdit(
		createdOrderEdit.id,
		{
			relations: defaultOrderEditRelations,
			select: defaultOrderEditFields,
		} as any
	);

	orderEdit = await myOrderEditService.decorateTotalsSupplierOrderEdit(
		orderEdit
	);
	return res.status(200).json({ order_edit: orderEdit });
}
