import type { MedusaRequest, MedusaResponse } from '@medusajs/medusa';

import SupplierService from '../../../services/supplier';
import { CreateSupplierInput } from 'src/types/supplier';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const supplierService: SupplierService = req.scope.resolve('supplierService');

  const searchParams = req.query;
  const limit = searchParams.limit ? Number(searchParams.limit) : 10;
  const offset = searchParams.offset ? Number(searchParams.offset) : 0;

  try {
    const {
      suppliers,
      count,
      limit: resultLimit,
      offset: resultOffset,
    } = await supplierService.list(limit, offset);

    return res
      .status(200)
      .json({ suppliers, count, offset: resultOffset, limit: resultLimit });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const supplierService: SupplierService = req.scope.resolve('supplierService');
  const data = await req.body;

  try {
    const supplier = await supplierService.create(data as CreateSupplierInput);
    return res.status(200).json({ supplier });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// export const AUTHENTICATE = false;