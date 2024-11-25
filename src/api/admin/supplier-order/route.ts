import { type MedusaRequest, type MedusaResponse } from '@medusajs/medusa';
import SupplierOrderService from 'src/services/supplier-order';
import { CreateSupplierOrderInput } from 'src/types/supplier-orders';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
	const supplierOrderService: SupplierOrderService = req.scope.resolve(
		'supplierOrderService'
	);

	const searchParams = req.query;

	const { offset, limit, q } = searchParams;

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
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const supplierOrderService: SupplierOrderService = req.scope.resolve(
		'supplierOrderService'
	);
	const data = await req.body;

	const supplierOrder = await supplierOrderService.create(
		data as CreateSupplierOrderInput
	);
	return res.status(200).json({ supplierOrder });
}

export const AUTHENTICATE = false;
