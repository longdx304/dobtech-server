import {
	cleanResponseData,
	MedusaRequest,
	MedusaResponse,
} from '@medusajs/medusa';
import { SupplierOrder } from '../../../../../models/supplier-order';
import ProductInboundService from 'src/services/product-inbound';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const productInboundService: ProductInboundService = req.scope.resolve(
		'productInboundService'
	);

	const { id } = req.params;

	await productInboundService.confirmInboundById(id);

	let supplierOrder: Partial<SupplierOrder> =
		await productInboundService.retrieveWithTotals(id, req.retrieveConfig, {
			includes: req.includes,
		});

	supplierOrder = cleanResponseData(supplierOrder, req.allowedProperties);

	res.json({
		supplierOrder: cleanResponseData(supplierOrder, []),
		message: 'Đơn hàng được xác nhận cập nhật số lượng trong kho',
	});
}
