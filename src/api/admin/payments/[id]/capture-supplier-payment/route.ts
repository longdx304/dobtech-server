import { AuthenticatedMedusaRequest, MedusaRequest, MedusaResponse } from '@medusajs/medusa';
import SupplierPaymentService from 'src/services/supplier-payment';
import { EntityManager } from 'typeorm';

export async function POST(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
): Promise<void> {
	try {
		const supplierPaymentService: SupplierPaymentService = req.scope.resolve(
			'supplierPaymentService'
		);
		const { id } = req.params;

		const manager: EntityManager = req.scope.resolve('manager');

		// Capture payment
		const data = await manager.transaction(async (transactionManager) => {
			return await supplierPaymentService
				.withTransaction(transactionManager)
				.capturePayment(id, req.body);
		});

		res.json({
			message: 'Capture payment successfully',
			data,
		});
	} catch (error) {
		console.log('error', error);
		res.status(500).json({ error: error.message });
	}
}
