import { MedusaRequest, MedusaResponse } from '@medusajs/medusa';
import { FulfillSupplierOrderStt } from 'src/models/supplier-order';
import SupplierOrderService from 'src/services/supplier-order';
import { EntityManager } from 'typeorm';

export type MarkAsFulfilledReq = {
	status: FulfillSupplierOrderStt;
};

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const supplierOrderService: SupplierOrderService = req.scope.resolve(
		'supplierOrderService'
	);
	const manager: EntityManager = req.scope.resolve('manager');

	const { id } = req.params;

	const data = req.body as MarkAsFulfilledReq;

	await manager.transaction(async (transactionManager) => {
		await supplierOrderService
			.withTransaction(transactionManager)
			.updateFulfillmentStatus(id, data.status);
	});

	const supplierOrder = await supplierOrderService.retrieveWithTotals(
		id,
		req.retrieveConfig
	);

	return res.status(200).json({ supplierOrder });
}
