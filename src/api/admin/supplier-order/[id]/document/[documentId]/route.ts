import { MedusaRequest, MedusaResponse } from '@medusajs/medusa';
import SupplierOrderDocumentService from 'src/services/supplier-order-document';

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
	const supplierOrderDocService: SupplierOrderDocumentService =
		req.scope.resolve('supplierOrderDocumentService');
	const { id, documentId } = req.params;

	try {
		await supplierOrderDocService.delete(documentId);
		return res.status(200).json({ success: true });
	} catch (error) {
		return res.status(404).json({ error: error.message });
	}
}