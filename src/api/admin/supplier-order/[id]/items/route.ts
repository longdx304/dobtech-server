import { MedusaRequest, MedusaResponse } from '@medusajs/medusa';
import SupplierOrderService from 'src/services/supplier-order';

export async function GET(
	req: MedusaRequest,
	res: MedusaResponse
): Promise<void> {
	const supplierOrderService: SupplierOrderService = req.scope.resolve(
		'supplierOrderService'
	);
	const { id } = req.params;

	try {
		const items = await supplierOrderService.retrieveLineItemsById(id);
		res.status(200).json({ items });
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
}
