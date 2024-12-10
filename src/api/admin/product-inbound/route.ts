import { MedusaError } from '@medusajs/utils';
import type {
	AuthenticatedMedusaRequest,
	MedusaResponse,
} from '@medusajs/medusa';
import ProductInboundService from 'src/services/product-inbound';
import { FulfillSupplierOrderStt } from '../../../models/supplier-order';
import {
	AdminPostItemInventory,
	CreateWarehouseWithVariant,
} from 'src/types/warehouse';

export async function GET(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const productInboundService: ProductInboundService = req.scope.resolve(
		'productInboundService'
	);

	const searchParams = req.query;

	const { offset, limit, status } = searchParams;

	const parsedStatuses = status
		? (status as FulfillSupplierOrderStt)
		: [
				FulfillSupplierOrderStt.DELIVERED,
				FulfillSupplierOrderStt.PARTIALLY_INVENTORIED,
				FulfillSupplierOrderStt.INVENTORIED,
		  ];

	const [supplierOrder, count] = await productInboundService.listAndCount(
		parsedStatuses,
		{
			skip: (offset ?? 0) as number,
			take: (limit ?? 20) as number,
		}
	);

	return res.status(200).json({ supplierOrder, count, offset, limit });
}

export async function POST(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) {
	const productInboundService: ProductInboundService = req.scope.resolve(
		'productInboundService'
	);

	const { warehouse, itemInventory } = req.body;

	const { location, variant_id, warehouse_id } = warehouse;

	const { quantity, unit_id, line_item_id, order_id, type } = itemInventory;

	// Data for warehouse
	const dataWarehouse: CreateWarehouseWithVariant = {
		warehouse_id,
		variant_id,
		unit_id,
		location,
	};

	// Data for item inventory
	const dataItemInventory: AdminPostItemInventory = {
		variant_id,
		quantity,
		unit_id,
		line_item_id,
		order_id,
		type,
	};

	const user_id = (req.user?.id ?? req.user?.userId) as string;

	if (!user_id) {
		throw new MedusaError(
			MedusaError.Types.INVALID_DATA,
			'Không tìm thấy user_id'
		);
	}

	const result =
		await productInboundService.createWarehouseAndInventoryTransaction(
			dataWarehouse,
			dataItemInventory,
			user_id
		);

	return res.status(200).json(result);
}
