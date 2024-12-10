import type {
	AuthenticatedMedusaRequest,
	MedusaResponse,
} from '@medusajs/medusa';

import ItemUnitService from '../../../services/item-unit';
import { CreateItemUnit } from '../../../types/item-unit';

export async function GET(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const itemUnitService: ItemUnitService = req.scope.resolve('itemUnitService');

	try {
		const item_units = await itemUnitService.list();
		return res.status(200).json({ item_units });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
}

export async function POST(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const itemUnitService: ItemUnitService = req.scope.resolve('itemUnitService');
	const data = (await req.body) as CreateItemUnit;

	const item_unit = await itemUnitService.create(data);
	return res.status(200).json({ item_unit });
}

export const AUTHENTICATE = false;
