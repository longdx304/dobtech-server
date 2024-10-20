import { MedusaRequest, MedusaResponse } from '@medusajs/medusa';
import SupplierOrderService from 'src/services/supplier-order';
import { EntityManager } from 'typeorm';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const supplierOrderService: SupplierOrderService = req.scope.resolve(
		'supplierOrderService'
	);
	const manager: EntityManager = req.scope.resolve('manager');

	const { id } = req.params;

	const data = req.body as any;

	try {
		await manager.transaction(async (transactionManager) => {
			await supplierOrderService
				.withTransaction(transactionManager)
				.createRefund(id, data.amount, data.reason, data.note, {
					no_notification: data.no_notification,
				});
		});

		const supplierOrder = await supplierOrderService.retrieveWithTotals(
			id,
			req.retrieveConfig
		);

		return res.status(200).json({ supplierOrder });
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
}
