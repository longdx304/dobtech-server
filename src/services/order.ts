import {
	Cart,
	OrderService as MedusaOrderService,
	PricingService,
} from '@medusajs/medusa';
import { ORDER_CART_ALREADY_EXISTS_ERROR } from '@medusajs/medusa/dist/services/order';
import {
	isDefined,
	isString,
	MedusaError,
	MedusaV2Flag,
	promiseAll,
	SalesChannelFeatureFlag,
} from '@medusajs/utils';
import { Order } from 'src/models/order';
import { EntityManager } from 'typeorm';
import PriceListService from './price-list';

type InjectedDependencies = {
	manager: EntityManager;
	pricingService: PricingService;
	priceListService: PriceListService;
};

class OrderService extends MedusaOrderService {
	protected manager_: EntityManager;
	protected readonly pricingService_: PricingService;
	protected readonly priceListService_: PriceListService;

	constructor({ pricingService, priceListService }: InjectedDependencies) {
		super(arguments[0]);
		this.pricingService_ = pricingService;
		this.priceListService_ = priceListService;
	}

	async asignOrderToHandler(orderId: string, handlerId: string) {
		return this.atomicPhase_(async (transactionManager: EntityManager) => {
			const orderRepository = transactionManager.withRepository(
				this.orderRepository_
			);
			const order = await orderRepository.findOne({ where: { id: orderId } });
			order.handler_id = handlerId;
			return await orderRepository.save(order);
		});
	}

	/**
	 * Creates an order from a cart
	 * @return resolves to the creation result.
	 * @param cartOrId
	 */
	async createFromCartDraft(
		cartOrId: string | Cart,
		isSendEmail: boolean,
		urlPdf: string
	): Promise<Order | never> {
		return await this.atomicPhase_(async (manager) => {
			const cartServiceTx = this.cartService_.withTransaction(manager);

			const exists = !!(await this.retrieveByCartId(
				isString(cartOrId) ? cartOrId : cartOrId?.id,
				{
					select: ['id'],
				}
			).catch(() => void 0));

			if (exists) {
				throw new MedusaError(
					MedusaError.Types.DUPLICATE_ERROR,
					ORDER_CART_ALREADY_EXISTS_ERROR
				);
			}

			const cart = isString(cartOrId)
				? await cartServiceTx.retrieveWithTotals(cartOrId, {
						relations: ['region', 'payment', 'items'],
				  })
				: cartOrId;

			if (cart.items.length === 0) {
				throw new MedusaError(
					MedusaError.Types.INVALID_DATA,
					'Cannot create order from empty cart'
				);
			}

			if (!cart.customer_id) {
				throw new MedusaError(
					MedusaError.Types.INVALID_DATA,
					'Cannot create an order from the cart without a customer'
				);
			}

			const { payment, region, total } = cart;

			// Would be the case if a discount code is applied that covers the item
			// total
			if (total !== 0) {
				if (!payment) {
					throw new MedusaError(
						MedusaError.Types.INVALID_ARGUMENT,
						'Cart does not contain a payment method'
					);
				}

				const paymentStatus = await this.paymentProviderService_
					.withTransaction(manager)
					.getStatus(payment);

				if (paymentStatus !== 'authorized') {
					throw new MedusaError(
						MedusaError.Types.INVALID_ARGUMENT,
						'Payment method is not authorized'
					);
				}
			}

			const orderRepo = manager.withRepository(this.orderRepository_);

			// TODO: Due to cascade insert we have to remove the tax_lines that have been added by the cart decorate totals.
			// Is the cascade insert really used? Also, is it really necessary to pass the entire entities when creating or updating?
			// We normally should only pass what is needed?
			const shippingMethods = cart.shipping_methods.map((method) => {
				(method.tax_lines as any) = undefined;
				return method;
			});

			const toCreate = {
				payment_status: 'awaiting',
				discounts: cart.discounts,
				gift_cards: cart.gift_cards,
				shipping_methods: shippingMethods,
				shipping_address_id: cart.shipping_address_id,
				billing_address_id: cart.billing_address_id,
				region_id: cart.region_id,
				email: cart.email,
				customer_id: cart.customer_id,
				cart_id: cart.id,
				currency_code: region.currency_code,
				metadata: {
					files: [
						{
							url: urlPdf,
							name: 'Order PDF',
							created_at: new Date(),
						},
					],
				},
			} as Partial<Order>;

			if (
				cart.sales_channel_id &&
				this.featureFlagRouter_.isFeatureEnabled(SalesChannelFeatureFlag.key) &&
				!this.featureFlagRouter_.isFeatureEnabled(MedusaV2Flag.key)
			) {
				toCreate.sales_channel_id = cart.sales_channel_id;
			}

			if (cart.type === 'draft_order') {
				const draft = await this.draftOrderService_
					.withTransaction(manager)
					.retrieveByCartId(cart.id);

				toCreate.draft_order_id = draft.id;
				toCreate.no_notification = draft.no_notification_order;
			}

			const rawOrder = orderRepo.create(toCreate);
			const order = await orderRepo.save(rawOrder);

			if (
				this.featureFlagRouter_.isFeatureEnabled([
					SalesChannelFeatureFlag.key,
					MedusaV2Flag.key,
				])
			) {
				await this.remoteLink_.create({
					orderService: {
						order_id: order.id,
					},
					salesChannelService: {
						sales_channel_id: cart.sales_channel_id as string,
					},
				});
			}

			if (total !== 0 && payment) {
				await this.paymentProviderService_
					.withTransaction(manager)
					.updatePayment(payment.id, {
						order_id: order.id,
					});
			}

			if (!isDefined(cart.subtotal) || !isDefined(cart.discount_total)) {
				throw new MedusaError(
					MedusaError.Types.UNEXPECTED_STATE,
					'Unable to compute gift cardable amount during order creation from cart. The cart is missing the subtotal and/or discount_total'
				);
			}

			let giftCardableAmountBalance = cart.gift_card_total ?? 0;

			const giftCardService = this.giftCardService_.withTransaction(manager);

			// Order the gift cards by first ends_at date, then remaining amount. To ensure largest possible amount left, for longest possible time.
			const orderedGiftCards = cart.gift_cards.sort((a, b) => {
				const aEnd = a.ends_at ?? new Date(2100, 1, 1);
				const bEnd = b.ends_at ?? new Date(2100, 1, 1);
				return aEnd.getTime() - bEnd.getTime() || a.balance - b.balance;
			});

			for (const giftCard of orderedGiftCards) {
				const newGiftCardBalance = Math.max(
					0,
					giftCard.balance - giftCardableAmountBalance
				);
				const giftCardBalanceUsed = giftCard.balance - newGiftCardBalance;

				await giftCardService.update(giftCard.id, {
					balance: newGiftCardBalance,
					is_disabled: newGiftCardBalance === 0,
				});

				await giftCardService.createTransaction({
					gift_card_id: giftCard.id,
					order_id: order.id,
					amount: giftCardBalanceUsed,
					is_taxable: !!giftCard.tax_rate,
					tax_rate: giftCard.tax_rate,
				});

				giftCardableAmountBalance =
					giftCardableAmountBalance - giftCardBalanceUsed;

				if (giftCardableAmountBalance == 0) {
					break;
				}
			}

			const shippingOptionServiceTx =
				this.shippingOptionService_.withTransaction(manager);
			const lineItemServiceTx = this.lineItemService_.withTransaction(manager);

			await promiseAll(
				[
					cart.items.map((lineItem): Promise<unknown>[] => {
						const toReturn: Promise<unknown>[] = [
							lineItemServiceTx.update(lineItem.id, { order_id: order.id }),
						];

						if (lineItem.is_giftcard) {
							toReturn.push(
								...this.createGiftCardsFromLineItem_(order, lineItem, manager)
							);
						}

						return toReturn;
					}),
					cart.shipping_methods.map(async (method): Promise<unknown> => {
						// TODO: Due to cascade insert we have to remove the tax_lines that have been added by the cart decorate totals.
						// Is the cascade insert really used? Also, is it really necessary to pass the entire entities when creating or updating?
						// We normally should only pass what is needed?
						(method.tax_lines as any) = undefined;
						return shippingOptionServiceTx.updateShippingMethod(method.id, {
							order_id: order.id,
						});
					}),
				].flat(Infinity)
			);

			if (isSendEmail) {
				await this.eventBus_
					.withTransaction(manager)
					.emit(OrderService.Events.PLACED, {
						id: order.id,
						no_notification: order.no_notification,
					});
			}

			await cartServiceTx.update(cart.id, { completed_at: new Date() });

			// Updates the private price for a customer based on the changes in an order.
			await this.customerPrivatePrice(order.id);
			return order;
		});
	}

	/**
	 * Updates the private price for a customer based on the changes in an order.
	 *
	 * @param manager - The transaction manager to use for database operations.
	 * @param orderEditId - The ID of the order edit to process.
	 * @returns A promise that resolves when the operation is complete.
	 *
	 * This method performs the following steps:
	 * 1. Retrieves the order edit and its related changes.
	 * 2. Finds the item update change in the order edit.
	 * 3. Retrieves the customer, currency code, and payment details of the order.
	 * 4. Updates the payment amount based on the total order amount.
	 * 5. Retrieves the pricing of the product variant for the customer.
	 * 6. Inserts or updates the private price of the customer if certain conditions are met.
	 */
	protected async customerPrivatePrice(order_id: string): Promise<void> {
		const pricingServiceTx = this.pricingService_.withTransaction(
			this.activeManager_
		);
		const priceListServiceTx = this.priceListService_.withTransaction(
			this.activeManager_
		);

		// Get the customer, currency code of the order
		const { customer_id, customer, currency_code, items }: Order =
			await this.retrieveWithTotals(order_id, {
				relations: ['customer', 'payments'],
			});

		if (!items?.length) {
			return;
		}

		await Promise.all(
			items.map(async (item) => {
				// Get the pricing of the product variant
				const pricingItem = await pricingServiceTx.getProductVariantPricing(
					{
						id: item.variant_id,
						product_id: item.variant.product_id,
					},
					{
						customer_id,
						currency_code,
					}
				);

				// Insert or Update the private price of the
				// customer based on the calculated price
				if (
					customer_id &&
					pricingItem &&
					pricingItem.calculated_price_type !== 'sale' &&
					item.unit_price < pricingItem.calculated_price
				) {
					const upsertPriceListInput = {
						currency_code: currency_code,
						amount: item.unit_price,
						variant_id: item.variant_id,
					};
					await priceListServiceTx.upsertPrivatePriceList(
						{
							id: customer_id,
							name: `${customer?.last_name} ${customer?.first_name}`,
							email: customer?.email,
						},
						upsertPriceListInput
					);
				}
			})
		);
	}
}

export default OrderService;
