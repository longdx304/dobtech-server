import { MedusaError } from '@medusajs/utils';
import { MedusaRequest, MedusaResponse } from '@medusajs/medusa';
import ProductInboundService from 'src/services/product-inbound';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const productInboundService: ProductInboundService = req.scope.resolve(
		'productInboundService'
	);
	const user_id = (req.user?.id ?? req.user?.userId) as string;

	if (!user_id) {
		throw new MedusaError(
			MedusaError.Types.INVALID_DATA,
			'Không tìm thấy user_id'
		);
	}
	const { id } = req.params;

	await productInboundService.assignToHandler(id, user_id);

	res.json({ message: 'Đã thêm người xử lý cho đơn hàng này' });
}
