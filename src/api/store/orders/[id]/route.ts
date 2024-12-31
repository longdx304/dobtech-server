import {
	cleanResponseData,
	MedusaRequest,
	MedusaResponse,
	OrderService,
} from '@medusajs/medusa';
import { EntityManager } from 'typeorm';

export async function POST(
	req: MedusaRequest,
	res: MedusaResponse
): Promise<void> {
	const orderService: OrderService = req.scope.resolve('orderService');

	const { id } = req.params;
  const data = (await req.body) as any;
	const manager: EntityManager = req.scope.resolve('manager');
	await manager.transaction(async (transactionManager) => {
		return await orderService
			.withTransaction(transactionManager)
			.update(id, data);
	});

	const order = await orderService.retrieveWithTotals(id, req.retrieveConfig, {
		includes: req.includes,
	});

	res.status(200).json({ order: cleanResponseData(order, []) });
}
