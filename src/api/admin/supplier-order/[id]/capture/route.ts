import {
	cleanResponseData,
	MedusaRequest,
	MedusaResponse,
} from '@medusajs/medusa';
import SupplierOrderService from 'src/services/supplier-order';
import { EntityManager } from 'typeorm';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const manager: EntityManager = req.scope.resolve('manager');
	const supplierOrderService: SupplierOrderService = req.scope.resolve(
		'supplierOrderService'
	);

	const { id } = req.params;

	await manager.transaction(async (transactionManager) => {
		await supplierOrderService
			.withTransaction(transactionManager)
			.capturePayment(id);
	});

	const supplierOrder = await supplierOrderService.retrieveWithTotals(
		id,
		req.retrieveConfig,
		{
			includes: req.includes,
		}
	);

	res.json({ supplierOrder: cleanResponseData(supplierOrder, []) });
}
