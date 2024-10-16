import { MedusaRequest, MedusaResponse } from '@medusajs/medusa';
import SupplierOrderDocumentService from 'src/services/supplier-order-document';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const supplierOrderDocService: SupplierOrderDocumentService =
		req.scope.resolve('supplierOrderDocumentService');

	const data = await req.body;
	const { id } = req.params;

	try {
		await supplierOrderDocService.create(id, data as string[]);
		return res.status(200).json({ success: true });
	} catch (error) {
		return res.status(404).json({ error: error.message });
	}
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
	const supplierOrderDocService: SupplierOrderDocumentService =
		req.scope.resolve('supplierOrderDocumentService');
	const { id } = req.params;

	const data = await req.body;
	console.log('data:', data);

	try {
		// await supplierOrderDocService.delete(data);
		return res.status(200).json({ success: true });
	} catch (error) {
		return res.status(404).json({ error: error.message });
	}
}
