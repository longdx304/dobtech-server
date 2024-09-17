import type { MedusaRequest, MedusaResponse } from '@medusajs/medusa';
import SupplierOrderService from 'src/services/supplier-order';
import { CreateSupplierOrderInput } from 'src/types/supplier-orders';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
	const supplierOrderService: SupplierOrderService = req.scope.resolve(
		'supplierOrderService'
	);

	const searchParams = req.query;

	const { offset, limit, q } = searchParams;
	try {
		const [supplierOrder, count] = await supplierOrderService.listAndCount(
			{
				q: (q as string) ?? '',
			},
			{
				skip: (offset ?? 0) as number,
				take: (limit ?? 20) as number,
			}
		);

		return res.status(200).json({ supplierOrder, count, offset, limit });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const supplierOrderService: SupplierOrderService = req.scope.resolve(
		'supplierOrderService'
	);
	const data = await req.body;

	try {
		const supplierOrder = await supplierOrderService.create(
			data as CreateSupplierOrderInput
		);
		return res.status(200).json({ supplierOrder });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
}

export const AUTHENTICATE = false;
