import { MedusaRequest, MedusaResponse } from '@medusajs/medusa';
import ItemUnitService from '../../../../services/item-unit';
import { UpdateItemUnit } from '../../../../types/item-unit';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
	const itemUnitService: ItemUnitService = req.scope.resolve('itemUnitService');
	const { id } = req.params;

	try {
		const item_unit = await itemUnitService.retrieve(id);

		if (!item_unit) {
			return res.status(404).json({ error: 'ItemUnit not found' });
		}

		return res.status(200).json({ item_unit });
	} catch (error) {
		return res.status(404).json({ error: error.message });
	}
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const itemUnitService: ItemUnitService = req.scope.resolve('itemUnitService');
	const { id } = req.params;
	const data = (await req.body) as UpdateItemUnit;

	try {
		const item_unit = await itemUnitService.update(id, data);
		return res.status(200).json({ item_unit });
	} catch (error) {
		return res.status(404).json({ error: error.message });
	}
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
	const itemUnitService: ItemUnitService = req.scope.resolve('itemUnitService');
	const { id } = req.params;

	try {
		await itemUnitService.delete(id);
		return res.status(200).json({
			id,
			object: 'item_unit',
			deleted: true,
		});
	} catch (error) {
		return res.status(404).json({ error: error.message });
	}
}

export const AUTHENTICATE = false;
