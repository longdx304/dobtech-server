import {
	buildQuery,
	FindConfig,
	FulfillmentStatus,
	LineItem,
	LineItemService,
	NewTotalsService,
	TotalsService,
	TransactionBaseService,
} from '@medusajs/medusa';
import LineItemRepository from '@medusajs/medusa/dist/repositories/line-item';
import OrderRepository from '@medusajs/medusa/dist/repositories/order';
import { TotalsContext } from '@medusajs/medusa/dist/types/orders';
import { isDefined, MedusaError, promiseAll } from '@medusajs/utils';
import { Order } from 'src/models/order';
import { EntityManager, In, IsNull, Not } from 'typeorm';
import OrderService from './order';

type InjectedDependencies = {
	manager: EntityManager;
	orderRepository: typeof OrderRepository;
	lineItemRepository: typeof LineItemRepository;
	lineItemService: LineItemService;
	orderService: OrderService;
	newTotalsService: NewTotalsService;
	totalsService: TotalsService;
};

class ProductOutboundService extends TransactionBaseService {
	protected orderRepository_: typeof OrderRepository;
	protected lineItemRepository_: typeof LineItemRepository;
	protected lineItemService_: LineItemService;
	protected orderService_: OrderService;
	protected readonly newTotalsService_: NewTotalsService;
	protected readonly totalsService_: TotalsService;

	constructor({
		orderRepository,
		lineItemRepository,
		lineItemService,
		orderService,
		newTotalsService,
		totalsService,
	}: InjectedDependencies) {
		super(arguments[0]);

		this.orderRepository_ = orderRepository;
		this.lineItemRepository_ = lineItemRepository;
		this.lineItemService_ = lineItemService;
		this.orderService_ = orderService;
		this.newTotalsService_ = newTotalsService;
		this.totalsService_ = totalsService;
	}

	async listAndCount(
		status: FulfillmentStatus | FulfillmentStatus[],
		config: FindConfig<Order> = {
			skip: 0,
			take: 20,
		}
	): Promise<[Order[], number]> {
		const orderRepo = this.activeManager_.withRepository(this.orderRepository_);

		let fulfillStt: any = status;
		if (!Array.isArray(status)) {
			status === FulfillmentStatus.FULFILLED
				? (fulfillStt = status)
				: (fulfillStt = Not(FulfillmentStatus.FULFILLED));
		}

		const queryConfig = {
			skip: config.skip || 0,
			take: config.take || 20,
			relations: ['handler'],
			order: config.order || { created_at: 'DESC' },
			where: {
				fulfillment_status: Array.isArray(status) ? In(status) : fulfillStt,
			},
		};

		const count = await orderRepo.count(queryConfig);
		const orders = await orderRepo.find(queryConfig);

		return [orders, count];
	}

	async retrieve(
		orderId: string,
		config: FindConfig<Order> = {}
	): Promise<Order> {
		if (!isDefined(orderId)) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`"orderId" must be defined`
			);
		}

		const orderRepo = this.activeManager_.withRepository(this.orderRepository_);

		const query = buildQuery(
			{ id: orderId, handler_id: Not(IsNull()) },
			config
		);

		if (!(config.select || []).length) {
			query.select = undefined;
		}

		const queryRelations = { ...query.relations };
		delete query.relations;

		const raw = await orderRepo.findOneWithRelations(queryRelations, query);

		if (!raw) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`Order with id ${orderId} was not found`
			);
		}

		return raw;
	}

	async retrieveWithTotals(
		orderId: string,
		options: FindConfig<Order> = {},
		context: TotalsContext = {}
	): Promise<Order> {
		const relations = this.getTotalsRelations(options);
		const order = await this.retrieve(orderId, { ...options, relations });

		return await this.decorateTotals(order, context);
	}

	protected async decorateTotalsLegacy(
		order: Order,
		totalsFields: string[] = []
	): Promise<Order> {
		if (totalsFields.some((field) => ['subtotal', 'total'].includes(field))) {
			const calculationContext =
				await this.totalsService_.getCalculationContext(order, {
					exclude_shipping: true,
				});
			order.items = await promiseAll(
				(order.items || []).map(async (item) => {
					const itemTotals = await this.totalsService_.getLineItemTotals(
						item,
						order,
						{
							include_tax: true,
							calculation_context: calculationContext,
						}
					);

					return Object.assign(item, itemTotals);
				})
			);
		}

		for (const totalField of totalsFields) {
			switch (totalField) {
				case 'shipping_total': {
					order.shipping_total = await this.totalsService_.getShippingTotal(
						order
					);
					break;
				}
				case 'gift_card_total': {
					const giftCardBreakdown = await this.totalsService_.getGiftCardTotal(
						order
					);
					order.gift_card_total = giftCardBreakdown.total;
					order.gift_card_tax_total = giftCardBreakdown.tax_total;
					break;
				}
				case 'discount_total': {
					order.discount_total = await this.totalsService_.getDiscountTotal(
						order
					);
					break;
				}
				case 'tax_total': {
					order.tax_total = await this.totalsService_.getTaxTotal(order);
					break;
				}
				case 'subtotal': {
					order.subtotal = await this.totalsService_.getSubtotal(order);
					break;
				}
				case 'total': {
					order.total = await this.totalsService_
						.withTransaction(this.activeManager_)
						.getTotal(order);
					break;
				}
				case 'refunded_total': {
					order.refunded_total = this.totalsService_.getRefundedTotal(order);
					break;
				}
				case 'paid_total': {
					order.paid_total = this.totalsService_.getPaidTotal(order);
					break;
				}
				case 'refundable_amount': {
					const paid_total = this.totalsService_.getPaidTotal(order);
					const refunded_total = this.totalsService_.getRefundedTotal(order);
					order.refundable_amount = paid_total - refunded_total;
					break;
				}
				case 'items.refundable': {
					const items: LineItem[] = [];
					for (const item of order.items) {
						items.push({
							...item,
							refundable: await this.totalsService_.getLineItemRefund(order, {
								...item,
								quantity: item.quantity - (item.returned_quantity || 0),
							} as LineItem),
						} as LineItem);
					}
					order.items = items;
					break;
				}
				case 'swaps.additional_items.refundable': {
					for (const s of order.swaps) {
						const items: LineItem[] = [];
						for (const item of s.additional_items) {
							items.push({
								...item,
								refundable: await this.totalsService_.getLineItemRefund(order, {
									...item,
									quantity: item.quantity - (item.returned_quantity || 0),
								} as LineItem),
							} as LineItem);
						}
						s.additional_items = items;
					}
					break;
				}
				case 'claims.additional_items.refundable': {
					for (const c of order.claims) {
						const items: LineItem[] = [];
						for (const item of c.additional_items) {
							items.push({
								...item,
								refundable: await this.totalsService_.getLineItemRefund(order, {
									...item,
									quantity: item.quantity - (item.returned_quantity || 0),
								} as LineItem),
							} as LineItem);
						}
						c.additional_items = items;
					}
					break;
				}
				default: {
					break;
				}
			}
		}
		return order;
	}

	async decorateTotals(order: Order, totalsFields?: string[]): Promise<Order>;

	async decorateTotals(order: Order, context?: TotalsContext): Promise<Order>;

	/**
	 * Calculate and attach the different total fields on the object
	 * @param order
	 * @param totalsFieldsOrContext
	 */
	async decorateTotals(
		order: Order,
		totalsFieldsOrContext?: string[] | TotalsContext
	): Promise<Order> {
		if (Array.isArray(totalsFieldsOrContext)) {
			if (totalsFieldsOrContext.length) {
				return await this.decorateTotalsLegacy(order, totalsFieldsOrContext);
			}
			totalsFieldsOrContext = {};
		}

		const newTotalsServiceTx = this.newTotalsService_.withTransaction(
			this.activeManager_
		);

		const calculationContext = await this.totalsService_.getCalculationContext(
			order
		);

		const { returnable_items } = totalsFieldsOrContext?.includes ?? {};

		const returnableItems: LineItem[] | undefined = isDefined(returnable_items)
			? []
			: undefined;

		const isReturnableItem = (item) =>
			returnable_items &&
			(item.returned_quantity ?? 0) < (item.shipped_quantity ?? 0);

		const allItems: LineItem[] = [...(order.items ?? [])];

		if (returnable_items) {
			// All items must receive their totals and if some of them are returnable
			// They will be pushed to `returnable_items` at a later point
			allItems.push(
				...(order.swaps?.map((s) => s.additional_items ?? []).flat() ?? []),
				...(order.claims?.map((c) => c.additional_items ?? []).flat() ?? [])
			);
		}

		const orderShippingMethods = [...(order.shipping_methods ?? [])];

		const itemsTotals = await newTotalsServiceTx.getLineItemTotals(allItems, {
			taxRate: order.tax_rate,
			includeTax: true,
			calculationContext,
		});
		const shippingTotals = await newTotalsServiceTx.getShippingMethodTotals(
			orderShippingMethods,
			{
				taxRate: order.tax_rate,
				discounts: order.discounts,
				includeTax: true,
				calculationContext,
			}
		);

		order.subtotal = 0;
		order.discount_total = 0;
		order.shipping_total = 0;
		order.refunded_total =
			Math.round(order.refunds?.reduce((acc, next) => acc + next.amount, 0)) ||
			0;
		order.paid_total =
			order.payments?.reduce((acc, next) => (acc += next.amount), 0) || 0;
		order.refundable_amount = order.paid_total - order.refunded_total || 0;

		let item_tax_total = 0;
		let shipping_tax_total = 0;

		order.items = (order.items || []).map((item) => {
			item.quantity = item.quantity - (item.returned_quantity || 0);
			const refundable = newTotalsServiceTx.getLineItemRefund(item, {
				calculationContext,
				taxRate: order.tax_rate,
			});

			Object.assign(item, itemsTotals[item.id] ?? {}, { refundable });

			order.subtotal += item.subtotal ?? 0;
			order.discount_total += item.raw_discount_total ?? 0;
			item_tax_total += item.tax_total ?? 0;

			if (isReturnableItem(item)) {
				returnableItems?.push(item);
			}

			return item;
		});

		order.shipping_methods = (order.shipping_methods || []).map(
			(shippingMethod) => {
				const methodWithTotals = Object.assign(
					shippingMethod,
					shippingTotals[shippingMethod.id] ?? {}
				);

				order.shipping_total += methodWithTotals.subtotal ?? 0;
				shipping_tax_total += methodWithTotals.tax_total ?? 0;

				return methodWithTotals;
			}
		);

		order.item_tax_total = item_tax_total;
		order.shipping_tax_total = shipping_tax_total;
		order.tax_total = item_tax_total + shipping_tax_total;

		const giftCardableAmount = this.newTotalsService_.getGiftCardableAmount({
			gift_cards_taxable: order.region?.gift_cards_taxable,
			subtotal: order.subtotal,
			discount_total: order.discount_total,
			shipping_total: order.shipping_total,
			tax_total: order.tax_total,
		});

		const giftCardTotal = await this.newTotalsService_.getGiftCardTotals(
			giftCardableAmount,
			{
				region: order.region,
				giftCards: order.gift_cards,
				giftCardTransactions: order.gift_card_transactions ?? [],
			}
		);
		order.gift_card_total = giftCardTotal.total || 0;
		order.gift_card_tax_total = giftCardTotal.tax_total || 0;

		order.tax_total -= order.gift_card_tax_total;

		for (const swap of order.swaps ?? []) {
			swap.additional_items = swap.additional_items.map((item) => {
				item.quantity = item.quantity - (item.returned_quantity || 0);
				const refundable = newTotalsServiceTx.getLineItemRefund(item, {
					calculationContext,
					taxRate: order.tax_rate,
				});

				Object.assign(item, itemsTotals[item.id] ?? {}, { refundable });

				if (isReturnableItem(item)) {
					returnableItems?.push(item);
				}

				return item;
			});
		}

		for (const claim of order.claims ?? []) {
			claim.additional_items = claim.additional_items.map((item) => {
				item.quantity = item.quantity - (item.returned_quantity || 0);
				const refundable = newTotalsServiceTx.getLineItemRefund(item, {
					calculationContext,
					taxRate: order.tax_rate,
				});

				Object.assign(item, itemsTotals[item.id] ?? {}, { refundable });

				if (isReturnableItem(item)) {
					returnableItems?.push(item);
				}

				return item;
			});
		}

		order.raw_discount_total = order.discount_total;
		order.discount_total = Math.round(order.discount_total);

		order.total =
			order.subtotal +
			order.shipping_total +
			order.tax_total -
			(order.gift_card_total + order.discount_total);

		order.returnable_items = returnableItems;

		return order;
	}

	private getTotalsRelations(config: FindConfig<Order>): string[] {
		const relationSet = new Set(config.relations);

		relationSet.add('items');
		relationSet.add('items.tax_lines');
		relationSet.add('items.adjustments');
		relationSet.add('items.variant');
		relationSet.add('swaps');
		relationSet.add('swaps.additional_items');
		relationSet.add('swaps.additional_items.tax_lines');
		relationSet.add('swaps.additional_items.adjustments');
		relationSet.add('claims');
		relationSet.add('claims.additional_items');
		relationSet.add('claims.additional_items.tax_lines');
		relationSet.add('claims.additional_items.adjustments');
		relationSet.add('discounts');
		relationSet.add('discounts.rule');
		relationSet.add('gift_cards');
		relationSet.add('gift_card_transactions');
		relationSet.add('refunds');
		relationSet.add('shipping_methods');
		relationSet.add('shipping_methods.tax_lines');
		relationSet.add('region');
		relationSet.add('payments');
		relationSet.add('handler');

		return Array.from(relationSet.values());
	}

	async assignToHandler(id: string, userId: string) {
		const orderRepo = this.activeManager_.withRepository(this.orderRepository_);

		const order = await orderRepo.findOne({ where: { id } });

		if (!order) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`Không tìm thấy đơn hàng với id ${id}`
			);
		}

		if (order?.handler_id) {
			throw new MedusaError(
				MedusaError.Types.NOT_ALLOWED,
				`Đơn hàng này đã có người xử lý`
			);
		}

		order.handler_id = userId;

		await orderRepo.save(order);
	}
}

export default ProductOutboundService;
