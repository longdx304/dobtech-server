import {
	AuthenticatedMedusaRequest,
	CartService,
	cleanResponseData,
	DraftOrderService,
	EventBusService,
	MedusaResponse,
	Order,
	// OrderService,
	PaymentProviderService,
	ProductVariantInventoryService,
} from '@medusajs/medusa';
import {
	defaultAdminOrdersFields,
	defaultAdminOrdersRelations,
} from '@medusajs/medusa/dist/types/orders';
import { MedusaError, promiseAll } from '@medusajs/utils';
import OrderService from '../../../../../services/order';
import { EntityManager } from 'typeorm';

export type AdminPostDraftOrderReq = {
	isSendEmail: boolean;
	urlPdf: string;
};

export async function POST(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
): Promise<void> {
	const { id } = req.params;

	const draftOrderService: DraftOrderService =
		req.scope.resolve('draftOrderService');
	const paymentProviderService: PaymentProviderService = req.scope.resolve(
		'paymentProviderService'
	);
	const orderService: OrderService = req.scope.resolve('orderService');
	const cartService: CartService = req.scope.resolve('cartService');
	const entityManager: EntityManager = req.scope.resolve('manager');
	const productVariantInventoryService: ProductVariantInventoryService =
		req.scope.resolve('productVariantInventoryService');

	const data = (await req.body) as AdminPostDraftOrderReq;

	const order = await entityManager.transaction(async (manager) => {
		const draftOrderServiceTx = draftOrderService.withTransaction(manager);
		const orderServiceTx = orderService.withTransaction(manager);
		const cartServiceTx = cartService.withTransaction(manager);

		const draftOrder = await draftOrderServiceTx.retrieve(id);

		const cart = await cartServiceTx.retrieveWithTotals(draftOrder.cart_id);

		await paymentProviderService
			.withTransaction(manager)
			.createSession('system', cart);

		await cartServiceTx.setPaymentSession(cart.id, 'system');

		await cartServiceTx.createTaxLines(cart.id);

		await cartServiceTx.authorizePayment(cart.id);

		let order = await orderServiceTx.createFromCartDraft(
			cart.id,
			data.isSendEmail,
			data.urlPdf
		);

		// retrieve the created order
		order = await orderServiceTx.retrieve(order.id, {
			relations: defaultAdminOrdersRelations,
			select: defaultAdminOrdersFields,
		} as any);

		// Reserve quantity after order creation
		await reserveQuantityForDraftOrder(order, {
			productVariantInventoryService: productVariantInventoryService,
		});

		await draftOrderServiceTx.registerCartCompletion(draftOrder.id, order.id);

		order = await orderService
			.withTransaction(manager)
			.retrieveWithTotals(order.id, {
				relations: defaultAdminOrdersRelations,
				select: defaultAdminOrdersFields,
			} as any);

		return order;
	});
	res.status(200).json({ order: cleanResponseData(order, []) });
}

export const reserveQuantityForDraftOrder = async (
	order: Order,
	context: {
		productVariantInventoryService: ProductVariantInventoryService;
		locationId?: string;
	}
) => {
	const { productVariantInventoryService, locationId } = context;
	await promiseAll(
		order?.items?.map(async (item) => {
			if (item.variant_id) {
				const inventoryConfirmed =
					await productVariantInventoryService.confirmInventory(
						item.variant_id,
						item.quantity,
						{ salesChannelId: order.sales_channel_id }
					);

				if (!inventoryConfirmed) {
					throw new MedusaError(
						MedusaError.Types.NOT_ALLOWED,
						`Variant with id: ${item.variant_id} does not have the required inventory`,
						MedusaError.Codes.INSUFFICIENT_INVENTORY
					);
				}

				await productVariantInventoryService.reserveQuantity(
					item.variant_id,
					item.quantity,
					{
						lineItemId: item.id,
						salesChannelId: order.sales_channel_id,
					}
				);
			}
		})
	);
};
