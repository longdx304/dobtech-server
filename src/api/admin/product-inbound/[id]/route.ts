import {
	cleanResponseData,
	MedusaRequest,
	MedusaResponse,
} from '@medusajs/medusa';
import ProductInboundService from 'src/services/product-inbound';
import { SupplierOrder } from '../../../../models/supplier-order';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
	const productInboundService: ProductInboundService = req.scope.resolve(
		'productInboundService'
	);
	const { id } = req.params;

	let supplierOrder: Partial<SupplierOrder> =
		await productInboundService.retrieveWithTotals(id, req.retrieveConfig, {
			includes: req.includes,
		});

	supplierOrder = cleanResponseData(supplierOrder, req.allowedProperties);

	res.json({ supplierOrder: cleanResponseData(supplierOrder, []) });
}
