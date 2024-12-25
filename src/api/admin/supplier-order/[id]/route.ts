import {
	cleanResponseData,
	MedusaRequest,
	MedusaResponse,
} from '@medusajs/medusa';
import { SupplierOrder } from 'src/models/supplier-order';
import SupplierOrderService from 'src/services/supplier-order';
import {
	DeleteLineItemRequest,
	UpdateSupplierOrder,
} from 'src/types/supplier-orders';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
	const supplierOrderService: SupplierOrderService = req.scope.resolve(
		'supplierOrderService'
	);
	const { id } = req.params;

	let supplierOrder: Partial<SupplierOrder> =
		await supplierOrderService.retrieveWithTotals(id, req.retrieveConfig, {
			includes: req.includes,
		});

	supplierOrder = cleanResponseData(supplierOrder, req.allowedProperties);

	res.json({ supplierOrder: cleanResponseData(supplierOrder, []) });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const supplierOrderService: SupplierOrderService = req.scope.resolve(
		'supplierOrderService'
	);
	const { id } = req.params;
	const data = req.body as UpdateSupplierOrder;

	const supplierOrder = await supplierOrderService.update(id, data);

	return res.status(200).json({ supplierOrder });
}

export async function DELETE(
	req: MedusaRequest<DeleteLineItemRequest>,
	res: MedusaResponse
) {
	const supplierOrderService: SupplierOrderService = req.scope.resolve(
		'supplierOrderService'
	);
	const { id } = req.params;
	const { lineItemId } = req.body;

	if (!lineItemId) {
		return res
			.status(400)
			.json({ error: 'lineItemId is required in the request body' });
	}

	const updatedSupplierOrder = await supplierOrderService.deleteLineItem(
		id,
		lineItemId
	);
	return res.status(200).json({ supplierOrder: updatedSupplierOrder });
}
