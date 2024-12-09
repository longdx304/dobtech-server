import {
	AuthenticatedMedusaRequest,
	defaultStoreCustomersFields,
	defaultStoreCustomersRelations,
	MedusaResponse,
} from '@medusajs/medusa';
import CustomerService from 'src/services/customer';
import { EntityManager } from 'typeorm';

export async function POST(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const { id } = req.params;
	const data = await req.body;

	const customerService: CustomerService = req.scope.resolve('customerService');
	const manager: EntityManager = req.scope.resolve('manager');
	await manager.transaction(async (transactionManager) => {
		return await customerService
			.withTransaction(transactionManager)
			.adminAddCustomerAddress(id, data);
	});

	const customer = await customerService.retrieve(id, {
		relations: defaultStoreCustomersRelations,
		select: defaultStoreCustomersFields,
	});

	res.status(200).json({ customer });
}
