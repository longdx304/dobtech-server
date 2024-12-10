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

	const items = await supplierOrderService.retrieveLineItemsById(id);
	res.status(200).json({ items });
}
