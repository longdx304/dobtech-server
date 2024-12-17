import type { MedusaRequest, MedusaResponse } from '@medusajs/medusa';

import { CreateSupplierInput } from 'src/types/supplier';
import SupplierService from '../../../services/supplier';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
	const supplierService: SupplierService = req.scope.resolve('supplierService');

	const searchParams = req.query;
	const q = searchParams.q ? String(searchParams.q) : '';
	const limit = searchParams.limit ? Number(searchParams.limit) : 10;
	const offset = searchParams.offset ? Number(searchParams.offset) : 0;

	const {
		suppliers,
		count,
		limit: resultLimit,
		offset: resultOffset,
	} = await supplierService.list(q, limit, offset);

	return res
		.status(200)
		.json({ suppliers, count, offset: resultOffset, limit: resultLimit });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const supplierService: SupplierService = req.scope.resolve('supplierService');
	const data = await req.body;

	const supplier = await supplierService.create(data as CreateSupplierInput);
	return res.status(200).json({ supplier });
}
