import { MedusaRequest, MedusaResponse } from '@medusajs/medusa';
import SupplierService from '../../../../services/supplier';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
	const supplierService: SupplierService = req.scope.resolve('supplierService');
	const { id } = req.params;

	try {
		const supplier = await supplierService.retrieve(id);

		if (!supplier) {
			return res.status(404).json({ error: 'Supplier not found' });
		}

		return res.status(200).json({ supplier });
	} catch (error) {
		return res.status(404).json({ error: error.message });
	}
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const supplierService: SupplierService = req.scope.resolve('supplierService');
	const { id } = req.params;

	const supplier = await supplierService.update(id, req.body);
	return res.status(200).json({ supplier });
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
	const supplierService: SupplierService = req.scope.resolve('supplierService');
	const { id } = req.params;

	await supplierService.delete(id);
	return res.status(200).json({ success: true });
}
