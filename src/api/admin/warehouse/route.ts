import type {
	AuthenticatedMedusaRequest,
	MedusaResponse,
} from '@medusajs/medusa';
import { Warehouse } from '../../../models/warehouse';
import WarehouseService from 'src/services/warehouse';

export async function GET(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const warehouseService: WarehouseService =
		req.scope.resolve('warehouseService');

	const searchParams = req.query;

	const { offset, limit } = searchParams;

	try {
		const [warehouse, count] = await warehouseService.listAndCount(
			{},
			{
				skip: (offset ?? 0) as number,
				take: (limit ?? 20) as number,
			}
		);

		return res.status(200).json({ warehouse, count, offset, limit });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
}

export async function POST(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const warehouseService: WarehouseService =
		req.scope.resolve('warehouseService');

	const data = (await req.body) as Partial<Warehouse>;

	try {
		const warehouse = await warehouseService.create(data);
		return res.status(200).json({ warehouse });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
}
