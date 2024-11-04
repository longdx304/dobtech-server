import {
	CartService,
	cleanResponseData,
	DraftOrderService,
	MedusaRequest,
	MedusaResponse,
	OrderService,
	PaymentProviderService,
	ProductVariantInventoryService,
	reserveQuantityForDraftOrder,
} from '@medusajs/medusa';
import {
	defaultAdminOrdersFields,
	defaultAdminOrdersRelations,
} from '@medusajs/medusa/dist/types/orders';
import { EntityManager } from 'typeorm';

export async function POST(
	req: MedusaRequest,
	res: MedusaResponse
): Promise<void> {
	const { id } = req.params;

	const draftOrderService: DraftOrderService =
		req.scope.resolve('draftOrderService');
	const paymentProviderService: PaymentProviderService = req.scope.resolve(
		'paymentProviderService'
	);
	const orderService: OrderService = req.scope.resolve('orderService');
	const inventoryService: OrderService = req.scope.resolve('inventoryService');
	const cartService: CartService = req.scope.resolve('cartService');
	const productVariantInventoryService: ProductVariantInventoryService =
		req.scope.resolve('productVariantInventoryService');
	const entityManager: EntityManager = req.scope.resolve('manager');

	try {
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

			let order = await orderServiceTx.createFromCart(cart.id);
			order = await orderService
				.withTransaction(manager)
				.retrieveWithTotals(order.id, {
					relations: defaultAdminOrdersRelations,
					select: defaultAdminOrdersFields,
				} as any);

			// TODO: Re-enable when we have a way to handle inventory for draft orders on creation
			if (!inventoryService) {
				await reserveQuantityForDraftOrder(order, {
					productVariantInventoryService,
				});
			}

			return order;
		});
		res.status(200).json({ order: cleanResponseData(order, []) });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
}
