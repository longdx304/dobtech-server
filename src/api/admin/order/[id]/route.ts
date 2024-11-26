import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/medusa';
import OrderService from 'src/services/order';

interface AssignOrderToHandlerReq {
	handler_id: string;
}

export async function POST(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const orderService: OrderService = req.scope.resolve('orderService');

	const { id } = req.params;

	const data = (await req.body) as AssignOrderToHandlerReq;

	await orderService.asignOrderToHandler(id, data.handler_id);

	return res.status(200).json({ success: true });
}
