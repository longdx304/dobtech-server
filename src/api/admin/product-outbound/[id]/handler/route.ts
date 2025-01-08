import { MedusaError } from '@medusajs/utils';
import {
	MedusaRequest,
	MedusaResponse,
} from '@medusajs/medusa';
import ProductOutboundService from 'src/services/product-outbound';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const productOutboundService: ProductOutboundService = req.scope.resolve(
		'productOutboundService'
	);
	const user_id = (req.user?.id ?? req.user?.userId) as string;

	if (!user_id) {
		throw new MedusaError(
			MedusaError.Types.INVALID_DATA,
			'Không tìm thấy user_id'
		);
	}
	const { id } = req.params;

	await productOutboundService.assignToHandler(id, user_id);

	res.json({ message: 'Đã thêm người xử lý cho đơn hàng này' });
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
	const productOutboundService: ProductOutboundService = req.scope.resolve(
		'productOutboundService'
	);
	const user_id = (req.user?.id ?? req.user?.userId) as string;

	if (!user_id) {
		throw new MedusaError(
			MedusaError.Types.INVALID_DATA,
			'Không tìm thấy user_id'
		);
	}
	const { id } = req.params;

	await productOutboundService.removeHandler(id, user_id);

	res.json({ message: 'Đã xóa người xử lý cho đơn hàng này' });
}
