import { MedusaRequest, MedusaResponse } from '@medusajs/medusa';
import SupplierOrderDocumentService from 'src/services/supplier-order-document';

interface SupplierOrderDocumentData {
	id: string;
	document_url: string[];
}
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
	const supplierOrderDocService: SupplierOrderDocumentService =
		req.scope.resolve('supplierOrderDocumentService');
	const { id } = req.params;

	await supplierOrderDocService.delete(id);
	return res.status(200).json({ success: true });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const supplierOrderDocService: SupplierOrderDocumentService =
		req.scope.resolve('supplierOrderDocumentService');

	const data = (await req.body) as SupplierOrderDocumentData;
	const { id, document_url } = data;

	await supplierOrderDocService.create(id, document_url);
	return res.status(200).json({ success: true });
}
