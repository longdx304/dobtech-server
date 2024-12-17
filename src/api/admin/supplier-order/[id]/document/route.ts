import { MedusaRequest, MedusaResponse } from '@medusajs/medusa';
import SupplierOrderDocumentService from 'src/services/supplier-order-document';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const supplierOrderDocService: SupplierOrderDocumentService =
		req.scope.resolve('supplierOrderDocumentService');

	const data = await req.body;
	const { id } = req.params;

	await supplierOrderDocService.create(id, data as string[]);
	return res.status(200).json({ success: true });
}
