import type { MedusaRequest, MedusaResponse } from '@medusajs/medusa';

import ItemUnitService from '../../../services/item-unit';
import { CreateItemUnit } from '../../../types/item-unit';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
	const itemUnitService: ItemUnitService = req.scope.resolve('itemUnitService');

	try {
		const item_units = await itemUnitService.list();
		return res.status(200).json({ item_units });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const itemUnitService: ItemUnitService = req.scope.resolve('itemUnitService');
	const data = await req.body as CreateItemUnit;

	try {
		const item_unit = await itemUnitService.create(data);
		return res.status(200).json({ item_unit });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
}

export const AUTHENTICATE = false;