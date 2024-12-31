import {
	AuthenticatedMedusaRequest,
	FulfillmentStatus,
	MedusaResponse,
	UserService,
} from '@medusajs/medusa';
import ProductOutboundService from 'src/services/product-outbound';

type AdminGetProductOutboundParams = {
	offset?: string;
	limit?: string;
	status?: string;
	myOrder?: boolean;
};
export async function GET(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const productOutboundService: ProductOutboundService = req.scope.resolve(
		'productOutboundService'
	);

	const userService: UserService = req.scope.resolve('userService');

	const { offset, limit, status, myOrder } =
		req.query as AdminGetProductOutboundParams;
	const user_id = (req.user?.id ?? req.user?.userId) as string;

	const parsedStatuses = status as FulfillmentStatus;
	// check if user is admin
	const user = await userService.retrieve(user_id);
	const isAdmin = user.role === 'admin';

	const [orders, count] = await productOutboundService.listAndCount(
		parsedStatuses,
		isAdmin ? false : myOrder,
		user_id,
		{
			skip: (offset ?? 0) as number,
			take: (limit ?? 20) as number,
		}
	);

	return res.status(200).json({ orders, count, offset, limit });
}
