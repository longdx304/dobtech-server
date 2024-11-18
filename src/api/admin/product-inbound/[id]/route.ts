import {
	cleanResponseData,
	MedusaRequest,
	MedusaResponse,
} from '@medusajs/medusa';
import { SupplierOrder } from '../../../../models/supplier-order';
import ProductInboundService from 'src/services/product-inbound';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
	const productInboundService: ProductInboundService = req.scope.resolve(
		'productInboundService'
	);
	const { id } = req.params;

	try {
		let supplierOrder: Partial<SupplierOrder> =
			await productInboundService.retrieveWithTotals(id, req.retrieveConfig, {
				includes: req.includes,
			});

		supplierOrder = cleanResponseData(supplierOrder, req.allowedProperties);

		res.json({ supplierOrder: cleanResponseData(supplierOrder, []) });
	} catch (error) {
		return res.status(404).json({ error: error.message });
	}
}
