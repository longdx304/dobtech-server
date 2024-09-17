import { MedusaRequest, MedusaResponse } from '@medusajs/medusa';
import SupplierOrderService from 'src/services/supplier-order';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
	const supplierOrderService: SupplierOrderService = req.scope.resolve(
		'supplierOrderService'
	);
	const { id } = req.params;

	try {
		const supplierOrder = await supplierOrderService.retrieve(id);

		if (!supplierOrder) {
			return res
				.status(404)
				.json({ error: 'Không tìm thấy đơn hàng của nhà cung cấp' });
		}

		return res.status(200).json({ supplierOrder });
	} catch (error) {
		return res.status(404).json({ error: error.message });
	}
}

// export async function PUT(req: MedusaRequest, res: MedusaResponse) {
//   const supplierService: SupplierService = req.scope.resolve('supplierService');
//   const { id } = req.params;

//   try {
//     const supplier = await supplierService.update(id, req.body);
//     return res.status(200).json({ supplier });
//   } catch (error) {
//     return res.status(404).json({ error: error.message });
//   }
// }

// export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
//   const supplierService: SupplierService = req.scope.resolve('supplierService');
//   const { id } = req.params;

//   try {
//     await supplierService.delete(id);
//     return res.status(200).json({ success: true });
//   } catch (error) {
//     return res.status(404).json({ error: error.message });
//   }
// }

export const AUTHENTICATE = false;
