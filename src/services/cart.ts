import { MedusaError } from '@medusajs/utils';
import { Cart, CartService, LineItem } from '@medusajs/medusa';
import { LineItemValidateData } from '@medusajs/medusa/dist/types/cart';
import { EntityManager, In } from 'typeorm';
import { isEqual } from 'lodash';

type InjectedDependencies = {
	manager: EntityManager;
	// cartService: CartService;
};

class MyCartService extends CartService {
	// protected cartService_: CartService;

	constructor({}: InjectedDependencies) {
		// eslint-disable-next-line prefer-rest-params
		super(arguments[0]);

		// this.cartService_ = cartService;
	}

	/**
	 * Adds or update one or multiple line items to the cart. It also update all existing items in the cart
	 * to have has_shipping to false. Finally, the adjustments will be updated.
	 * @param cartId - the id of the cart that we will add to
	 * @param lineItems - the line items to add.
	 * @param config
	 *    validateSalesChannels - should check if product belongs to the same sales chanel as cart
	 *                            (if cart has associated sales channel)
	 * @return the result of the update operation
	 */
	async addOrUpdateLineItemsSupplierOrder(
		cartId: string,
		lineItems: LineItem | LineItem[],
		config = { validateSalesChannels: true }
	): Promise<void> {
		const items: LineItem[] = Array.isArray(lineItems)
			? lineItems
			: [lineItems];

		const select: (keyof Cart)[] = ['id'];

		if (this.featureFlagRouter_.isFeatureEnabled('sales_channels')) {
			select.push('sales_channel_id');
		}

		return await this.atomicPhase_(
			async (transactionManager: EntityManager) => {
				let cart = await this.retrieve(cartId, { select });

				if (this.featureFlagRouter_.isFeatureEnabled('sales_channels')) {
					if (config.validateSalesChannels) {
						const areValid = await Promise.all(
							items.map(async (item) => {
								if (item.variant_id) {
									return await this.validateLineItem(
										cart,
										item as LineItemValidateData
									);
								}
								return true;
							})
						);

						const invalidProducts = areValid
							.map((valid, index) => {
								return !valid ? { title: items[index].title } : undefined;
							})
							.filter((v): v is { title: string } => !!v);

						if (invalidProducts.length) {
							throw new Error(
								`Sản phẩm [${invalidProducts
									.map((item) => item.title)
									.join(
										' - '
									)}] phải thuộc về kênh bán hàng mà giỏ hàng đã được tạo..`
							);
						}
					}
				}

				const lineItemServiceTx =
					this.lineItemService_.withTransaction(transactionManager);
				// const productVariantInventoryServiceTx =
				// 	this.productVariantInventoryService_.withTransaction(
				// 		transactionManager
				// 	);

				const existingItems = await lineItemServiceTx.list(
					{
						cart_id: cart.id,
						variant_id: In([items.map((item) => item.variant_id)]),
						should_merge: true,
					},
					{ select: ['id', 'metadata', 'quantity'] }
				);

				const existingItemsVariantMap = new Map();
				existingItems.forEach((item) => {
					existingItemsVariantMap.set(item.variant_id, item);
				});

				const lineItemsToCreate: LineItem[] = [];
				const lineItemsToUpdate: { [id: string]: LineItem }[] = [];
				for (const item of items) {
					let currentItem: LineItem | undefined;

					const existingItem = existingItemsVariantMap.get(item.variant_id);
					if (item.should_merge) {
						if (existingItem && isEqual(existingItem.metadata, item.metadata)) {
							currentItem = existingItem;
						}
					}

					// If content matches one of the line items currently in the cart we can
					// simply update the quantity of the existing line item
					item.quantity = currentItem
						? (currentItem.quantity += item.quantity)
						: item.quantity;

					// if (item.variant_id) {
					// 	const isSufficient =
					// 		await productVariantInventoryServiceTx.confirmInventory(
					// 			item.variant_id,
					// 			item.quantity,
					// 			{ salesChannelId: cart.sales_channel_id }
					// 		);

					// 	if (!isSufficient) {
					// 		throw new MedusaError(
					// 			MedusaError.Types.NOT_ALLOWED,
					// 			`Variant with id: ${item.variant_id} does not have the required inventory`,
					// 			MedusaError.Codes.INSUFFICIENT_INVENTORY
					// 		);
					// 	}
					// }

					if (currentItem) {
						lineItemsToUpdate[currentItem.id] = {
							quantity: item.quantity,
							has_shipping: false,
						};
					} else {
						// Since the variant is eager loaded, we are removing it before the line item is being created.
						delete (item as Partial<LineItem>).variant;
						item.has_shipping = false;
						item.cart_id = cart.id;
						lineItemsToCreate.push(item);
					}
				}

				const itemKeysToUpdate = Object.keys(lineItemsToUpdate);

				// Update all items that needs to be updated
				if (itemKeysToUpdate.length) {
					await Promise.all(
						itemKeysToUpdate.map(async (id) => {
							return await lineItemServiceTx.update(id, lineItemsToUpdate[id]);
						})
					);
				}

				// Create all items that needs to be created
				await lineItemServiceTx.create(lineItemsToCreate);

				await lineItemServiceTx
					.update(
						{
							cart_id: cartId,
							has_shipping: true,
						},
						{ has_shipping: false }
					)
					.catch((err: Error | MedusaError) => {
						// We only want to catch the errors related to not found items since we don't care if there is not item to update
						if ('type' in err && err.type === MedusaError.Types.NOT_FOUND) {
							return;
						}
						throw err;
					});

				cart = await this.retrieve(cart.id, {
					relations: [
						'items',
						'items.variant',
						'items.variant.product',
						'discounts',
						'discounts.rule',
						'region',
					],
				});

				await this.refreshAdjustments_(cart);

				await this.eventBus_
					.withTransaction(transactionManager)
					.emit(CartService.Events.UPDATED, { id: cart.id });
			}
		);
	}
}

export default MyCartService;
