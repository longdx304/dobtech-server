import {
	type SubscriberConfig,
	type SubscriberArgs,
	type ConfigModule,
	PricingService,
	OrderService,
	Order,
} from '@medusajs/medusa';
import OrderEditService from '../services/order-edit';
import PriceListService from 'src/services/price-list';

type OrderEditEvent = {
	id: string;
};

/**
 * This subscriber is responsible for updating the private price of the customer
 * when the order edit is confirmed.
 */
export default async function customerPrivatePrice({
	data,
	eventName,
	container,
	pluginOptions,
}: SubscriberArgs<OrderEditEvent>) {
	const orderEditService: OrderEditService =
		container.resolve('orderEditService');
	const pricingService: PricingService = container.resolve('pricingService');
	const orderService: OrderService = container.resolve('orderService');
	const priceListService: PriceListService =
		container.resolve('priceListService');

	const { id } = data;
	// Retrieve the order edit
	const orderEdit = await orderEditService.retrieve(id, {
		relations: [
			'changes',
			'changes.line_item',
			'changes.original_line_item',
			'changes.original_line_item.variant',
		],
	});

	// Find the item update change
	const changeItem = orderEdit.changes.find((change) => {
		return change.type === 'item_update';
	});

	if (!changeItem) {
		return;
	}
	// Get the customer, currency code of the order
	const { customer_id, customer, currency_code }: Order =
		await orderService.retrieve(orderEdit.order_id, {
			relations: ['customer'],
		});

	// Get the pricing of the product variant
	const pricingItem = await pricingService.getProductVariantPricing(
		{
			id: changeItem.line_item.variant_id,
			product_id: changeItem.line_item.product_id,
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
		changeItem.line_item.unit_price < pricingItem.calculated_price
	) {
		const upsertPriceListInput = {
			currency_code: currency_code,
			amount: changeItem.line_item.unit_price,
			variant_id: changeItem.line_item.variant_id,
		};
		await priceListService.upsertPrivatePriceList(
			{
				id: customer_id,
				name: `${customer?.last_name} ${customer?.first_name}`,
			},
			upsertPriceListInput
		);
	}
}

export const config: SubscriberConfig = {
	event: OrderEditService.Events.CONFIRMED,
	context: {
		subscriberId: 'customer-private-price',
	},
};
