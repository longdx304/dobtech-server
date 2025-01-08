import {
	buildQuery,
	Cart,
	EventBusService,
	FindConfig,
	LineItem,
	LineItemService,
	NewTotalsService,
	OrderService,
	OrderStatus,
	Payment,
	PaymentProviderService,
	PaymentSession,
	PaymentStatus,
	QuerySelector,
	RegionService,
	TotalsService,
	TransactionBaseService,
} from '@medusajs/medusa';
import CartRepository from '@medusajs/medusa/dist/repositories/cart';
import LineItemRepository from '@medusajs/medusa/dist/repositories/line-item';
import { TotalsContext } from '@medusajs/medusa/dist/types/orders';
import {
	buildRelations,
	buildSelects,
	isDefined,
	MedusaError,
} from '@medusajs/utils';
import SupplierOrderRepository from 'src/repositories/supplier-order';
import {
	CreateSupplierOrderInput,
	SupplierOrderSelector,
	UpdateSupplierOrder,
	UpdateSupplierOrderInput,
} from 'src/types/supplier-orders';
import { FlagRouter } from 'src/utils/flag-router';
import {
	EntityManager,
	FindManyOptions,
	FindOptionsWhere,
	ILike,
} from 'typeorm';
import {
	FulfillSupplierOrderStt,
	SupplierOrder,
} from '../models/supplier-order';
import MyCartService from './cart';
import EmailsService from './emails';
import MyPaymentProviderService from './my-payment-provider';
import SupplierOrderDocumentService from './supplier-order-document';

type InjectedDependencies = {
	manager: EntityManager;
	supplierOrderRepository: typeof SupplierOrderRepository;
	lineItemRepository: typeof LineItemRepository;
	cartRepository: typeof CartRepository;
	orderService: OrderService;
	supplierOrderDocumentService: SupplierOrderDocumentService;
	cartService: MyCartService;
	regionService: RegionService;
	lineItemService: LineItemService;
	paymentProviderService: PaymentProviderService;
	myPaymentProviderService: MyPaymentProviderService;
	emailsService: EmailsService;
	totalsService: TotalsService;
	featureFlagRouter: FlagRouter;
	eventBusService: EventBusService;
};

class SupplierOrderService extends TransactionBaseService {
	static readonly Events = {
		SEND_EMAIL: 'supplier.order_created',
		PAYMENT_CAPTURED: 'sorder.payment_captured',
		PAYMENT_CAPTURE_FAILED: 'sorder.payment_capture_failed',
		SHIPMENT_CREATED: 'sorder.shipment_created',
		FULFILLMENT_CREATED: 'sorder.fulfillment_created',
		FULFILLMENT_CANCELED: 'sorder.fulfillment_canceled',
		RETURN_REQUESTED: 'sorder.return_requested',
		ITEMS_RETURNED: 'sorder.items_returned',
		RETURN_ACTION_REQUIRED: 'sorder.return_action_required',
		REFUND_CREATED: 'sorder.refund_created',
		PLACED: 'sorder.placed',
		UPDATED: 'sorder.updated',
		CANCELED: 'sorder.canceled',
		COMPLETED: 'sorder.completed',
	};

	protected supplierOrderRepository_: typeof SupplierOrderRepository;
	protected lineItemRepository_: typeof LineItemRepository;
	protected cartRepository_: typeof CartRepository;
	protected orderService_: OrderService;
	protected supplierOrderDocumentService_: SupplierOrderDocumentService;
	protected cartService_: MyCartService;
	protected regionService_: RegionService;
	protected lineItemService_: LineItemService;
	protected emailsService_: EmailsService;
	protected paymentProviderService_: PaymentProviderService;
	protected myPaymentProviderService_: MyPaymentProviderService;
	protected readonly newTotalsService_: NewTotalsService;
	protected readonly totalsService_: TotalsService;
	protected readonly featureFlagRouter_: FlagRouter;
	protected readonly eventBus_: EventBusService;

	constructor({
		supplierOrderRepository,
		lineItemRepository,
		cartRepository,
		supplierOrderDocumentService,
		orderService,
		cartService,
		regionService,
		lineItemService,
		paymentProviderService,
		myPaymentProviderService,
		emailsService,
		totalsService,
		eventBusService,
		featureFlagRouter,
	}: InjectedDependencies) {
		super(arguments[0]);

		this.supplierOrderRepository_ = supplierOrderRepository;
		this.lineItemRepository_ = lineItemRepository;
		this.cartRepository_ = cartRepository;
		this.supplierOrderDocumentService_ = supplierOrderDocumentService;
		this.orderService_ = orderService;
		this.cartService_ = cartService;
		this.regionService_ = regionService;
		this.lineItemService_ = lineItemService;
		this.paymentProviderService_ = paymentProviderService; // session close if wrong
		this.eventBus_ = eventBusService;
		this.myPaymentProviderService_ = myPaymentProviderService;
		this.emailsService_ = emailsService;
		this.totalsService_ = totalsService;
		this.featureFlagRouter_ = featureFlagRouter;
	}

	async retrieve(
		id: string,
		config: FindConfig<SupplierOrder> = {}
	): Promise<SupplierOrder | undefined> {
		if (!isDefined(id)) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`"supplier_order_id" must be defined`
			);
		}

		const supplierOrderRepo = this.activeManager_.withRepository(
			this.supplierOrderRepository_
		);

		const query = buildQuery({ id: id }, config);

		if (!(config.select || []).length) {
			query.select = undefined;
		}
		const queryRelations = {
			...query.relations,
			documents: true,
			supplier: true,
			user: true,
			cart: true,
			payments: true,
			refunds: true,
		};
		delete query.relations;

		const raw = await supplierOrderRepo.findOneWithRelations(
			queryRelations,
			query
		);

		if (!raw) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`Order with id ${id} was not found`
			);
		}

		return raw;
	}

	async retrieveWithTotals(
		orderId: string,
		options: FindConfig<SupplierOrder> = {},
		context: TotalsContext = {}
	): Promise<SupplierOrder> {
		const relations = this.getTotalsRelations(options);
		const supplierOrder = await this.retrieve(orderId, {
			...options,
			relations,
		});

		return await this.decorateTotals(supplierOrder, context);
	}

	async list(
		selector: SupplierOrderSelector = {},
		config: FindConfig<SupplierOrder> = {
			skip: 0,
			take: 20,
			relations: ['supplier', 'user', 'cart', 'documents'],
		}
	): Promise<SupplierOrder[]> {
		const supplierOrderRepo = this.activeManager_.withRepository(
			this.supplierOrderRepository_
		);
		const [supplierOrders, count] = await this.listAndCount(selector, config);

		return supplierOrders;
	}

	async listAndCount(
		selector: QuerySelector<SupplierOrder>,
		config: FindConfig<SupplierOrder> = {
			skip: 0,
			take: 20,
			relations: ['supplier', 'user', 'cart', 'documents'],
		}
	): Promise<[SupplierOrder[], number]> {
		const supplierOrderRepo = this.activeManager_.withRepository(
			this.supplierOrderRepository_
		);

		const { q, ...supplierOrderSelectorRest } = selector;

		config.order = config.order || {
			created_at: 'DESC',
		};

		const query = buildQuery(
			{ ...supplierOrderSelectorRest },
			config
		) as FindManyOptions<SupplierOrder>;

		if (q) {
			const where = query.where as FindOptionsWhere<any>;
			delete where.q;

			query.where = [
				{
					...where,
					display_name: ILike(`%${q}%`),
				},
			];
		}

		const { select, relations } = this.transformQueryForTotals(config);
		query.select = buildSelects(select || []);

		const rels = buildRelations(this.getTotalsRelations({ relations }));

		// Remove original relations from the query to avoid conflicts
		delete query.relations;

		// Fetch the results with relations
		const raw = await supplierOrderRepo.findWithRelations(rels, query);
		const count = await supplierOrderRepo.count(query);

		// Decorate totals if required (example of a placeholder function for calculating totals)
		const supplierOrders = await Promise.all(
			raw.map(async (r) => await this.decorateTotals(r, select))
		);

		// Return the orders along with the count
		return [supplierOrders, count];
	}

	protected transformQueryForTotals(config: FindConfig<SupplierOrder>): {
		relations: string[] | undefined;
		select: FindConfig<SupplierOrder>['select'];
		totalsToSelect: FindConfig<SupplierOrder>['select'];
	} {
		let { select, relations } = config;

		if (!select) {
			return {
				select,
				relations,
				totalsToSelect: [],
			};
		}

		const totalFields = [
			'subtotal',
			'tax_total',
			'total',
			'paid_total',
			'refunded_total',
			'refundable_total',
			'items.refundable',
		];

		const totalsToSelect = select.filter((v) => totalFields.includes(v));
		if (totalsToSelect.length > 0) {
			const relationSet = new Set(relations);
			relationSet.add('items');
			relationSet.add('items.tax_lines');
			relationSet.add('items.adjustments');
			relationSet.add('items.variant');
			relationSet.add('items.variant.product');
			relationSet.add('region');
			relationSet.add('refunds');
			relations = [...relationSet];

			select = select.filter((v) => !totalFields.includes(v));
		}

		const toSelect = [...select];
		if (toSelect.length > 0 && toSelect.indexOf('tax_rate') === -1) {
		}

		return {
			relations,
			select: toSelect.length ? toSelect : undefined,
			totalsToSelect,
		};
	}

	/**
	 * Creates a cart with the line items in the input
	 * @param {EntityManager} transactionManager The transaction manager
	 * @param {CreateSupplierOrderInput} data The input data
	 * @returns {Promise<Cart>} The created cart
	 */
	async createCartWithLineItems(
		transactionManager: EntityManager,
		data: CreateSupplierOrderInput
	): Promise<Cart> {
		const { lineItems, countryCode, email } = data;

		// cart repo
		const cartRepo = this.activeManager_.withRepository(this.cartRepository_);

		// Get the region from the country code
		const region = await this.regionService_.retrieveByCountryCode(countryCode);
		// Create a cart for the user
		let cart = await this.cartService_
			.withTransaction(transactionManager)
			.create({
				region_id: region.id,
				email,
			});

		// Add line items in the cart
		await Promise.all(
			lineItems.map(async (lineItem) => {
				// Generate a line item from the variant
				const line = await this.lineItemService_
					.withTransaction(transactionManager)
					.generate(lineItem, {
						region_id: region.id,
						unit_price: lineItem.unit_price,
					});
				// Add the line item to the cart
				return await this.cartService_
					.withTransaction(transactionManager)
					.addOrUpdateLineItemsSupplierOrder(cart.id, line);
			})
		);
		// Create payment sessions for the cart
		await this.cartService_
			.withTransaction(transactionManager)
			.setPaymentSessions(cart.id);

		// Retrieve the cart with the items
		cart = await this.cartService_
			.withTransaction(transactionManager)
			.retrieveWithTotals(cart.id, {
				relations: [
					'items',
					'items.variant',
					'items.variant.product',
					'region',
					'payment_sessions',
				],
			});

		if (!cart.payment_session) {
			throw new MedusaError(
				MedusaError.Types.NOT_ALLOWED,
				'You cannot complete a cart without a payment session.'
			);
		}

		const session = (await this.paymentProviderService_
			.withTransaction(transactionManager)
			.authorizePayment(cart.payment_session, {})) as PaymentSession;

		if (session.status === 'authorized') {
			cart.payment = await this.paymentProviderService_
				.withTransaction(transactionManager)
				.createPayment({
					cart_id: cart.id,
					currency_code: cart.region.currency_code,
					amount: cart.total!,
					payment_session: cart.payment_session,
				});
			cart.payment_authorized_at = new Date();
		}

		// Save the cart
		cart = await cartRepo.save(cart);

		return cart;
	}

	/**
	 * Creates a supplier order
	 * @param {CreateSupplierOrderInput} data The input data
	 * @returns {Promise<SupplierOrder>} The created supplier order
	 */
	async create(data: CreateSupplierOrderInput): Promise<SupplierOrder> {
		return await this.atomicPhase_(
			async (transactionManager: EntityManager) => {
				const supplierOrderRepository = transactionManager.withRepository(
					this.supplierOrderRepository_
				);

				const LineItemService =
					this.lineItemService_.withTransaction(transactionManager);

				const {
					supplierId,
					userId,
					document_url,
					region_id,
					estimated_production_time,
					settlement_time,
					currency_code,
				} = data;

				// Create a cart for the user
				const cart = await this.createCartWithLineItems(
					transactionManager,
					data
				);

				const { payment, total } = cart;

				const payload = {
					supplier_id: supplierId,
					user_id: userId,
					cart_id: cart.id,
					region_id,
					currency_code,
					estimated_production_time,
					settlement_time,
					payment_status: PaymentStatus.AWAITING,
				};

				// Add line items in the supplier order
				const createSupplierOrder = supplierOrderRepository.create(payload);
				const supplierOrder = await supplierOrderRepository.save(
					createSupplierOrder
				);

				if (total !== 0 && payment) {
					await this.myPaymentProviderService_
						.withTransaction(transactionManager)
						.updateNewPayment(payment.id, {
							supplier_order_id: supplierOrder.id,
						});
				}

				// Update line items with the supplier_order_id
				await LineItemService.update({ cart_id: cart.id }, {
					supplier_order_id: supplierOrder.id,
				} as any);

				// retrieve supplier, user, cart
				const supplierOrderWithRelations = await this.retrieve(
					supplierOrder.id
				);

				// Create supplier order documents
				await this.supplierOrderDocumentService_
					.withTransaction(transactionManager)
					.create(supplierOrder.id, [document_url]);

				const optionsEmail = {
					attachments: [
						{
							filename: `dob_purchase-order.pdf`,
							path: document_url,
						},
					],
					cc: supplierOrderWithRelations.user.email || 'admin@test.com',
				};

				// Send email to the supplier and admin
				if (data.isSendEmail) {
					await this.emailsService_.sendEmail(
						supplierOrderWithRelations.supplier.email,
						SupplierOrderService.Events.SEND_EMAIL,
						supplierOrderWithRelations,
						optionsEmail
					);
				}

				return supplierOrder as SupplierOrder;
			}
		);
	}

	/**
	 * Update a cart with the line items in the input
	 * @param {EntityManager} transactionManager The transaction manager
	 * @param {UpdateSupplierOrderInput} data The input data
	 * @returns {Promise<Cart>} The updated cart
	 */
	async updateCartWithLineItems(
		transactionManager: EntityManager,
		data: UpdateSupplierOrderInput
	): Promise<Cart> {
		const { cartId, lineItems, metadata } = data;

		// Retrieve the cart
		let cart = await this.cartService_
			.withTransaction(transactionManager)
			.retrieve(cartId, {
				relations: ['region'],
			});

		// Add line items in the cart
		await Promise.all(
			lineItems.map(async (lineItem) => {
				// Generate a line item from the variant
				const line = await this.lineItemService_
					.withTransaction(transactionManager)
					.generate(lineItem, {
						region_id: cart.region_id,
						unit_price: lineItem?.unit_price,
						metadata,
					});
				// Add the line item to the cart
				return await this.cartService_
					.withTransaction(transactionManager)
					.addOrUpdateLineItemsSupplierOrder(cartId, line);
			})
		);

		// Retrieve and return the updated cart
		return await this.cartService_
			.withTransaction(transactionManager)
			.retrieve(cartId, {
				relations: [
					'items',
					'items.variant',
					'items.variant.product',
					'region',
				],
			});
	}

	async update(id: string, data: UpdateSupplierOrder): Promise<SupplierOrder> {
		return await this.atomicPhase_(
			async (transactionManager: EntityManager) => {
				const supplierOrderRepository = transactionManager.withRepository(
					this.supplierOrderRepository_
				);
				const supplierOrder = await supplierOrderRepository.findOne({
					where: { id },
				});
				if (!supplierOrder) {
					throw new MedusaError(
						MedusaError.Types.NOT_FOUND,
						`Đơn hàng với mã số ${id} không được tìm thấy`
					);
				}

				Object.assign(supplierOrder, data);
				return await supplierOrderRepository.save(supplierOrder);
			}
		);
	}

	async deleteLineItem(
		supplierOrderId: string,
		lineItemId: string
	): Promise<SupplierOrder> {
		return await this.atomicPhase_(
			async (transactionManager: EntityManager) => {
				// Retrieve the existing supplier order
				const existingSupplierOrder = await this.retrieve(supplierOrderId);
				if (!existingSupplierOrder) {
					throw new MedusaError(
						MedusaError.Types.NOT_FOUND,
						`Supplier order with id ${supplierOrderId} not found`
					);
				}

				// Remove the line item from the cart
				await this.cartService_
					.withTransaction(transactionManager)
					.removeLineItem(existingSupplierOrder.cart_id, lineItemId);

				// Retrieve and return the updated supplier order
				const updatedSupplierOrder = await this.retrieve(supplierOrderId);
				return updatedSupplierOrder;
			}
		);
	}

	/**
	 * Cancels an order.
	 * Throws if fulfillment process has been initiated.
	 * Throws if payment process has been initiated.
	 * @param supplierOrderId - id of order to cancel.
	 * @return result of the update operation.
	 */
	async cancelSupplierOrder(supplierOrderId: string): Promise<SupplierOrder> {
		return await this.atomicPhase_(
			async (transactionManager: EntityManager) => {
				const supplierOrder = await this.retrieve(supplierOrderId, {
					relations: ['refunds', 'payments', 'items'],
				});

				if (supplierOrder.refunds?.length > 0) {
					throw new MedusaError(
						MedusaError.Types.NOT_ALLOWED,
						'Order with refund(s) cannot be canceled'
					);
				}

				const paymentProviderServiceTx =
					this.paymentProviderService_.withTransaction(transactionManager);
				for (const p of supplierOrder.payments) {
					await paymentProviderServiceTx.cancelPayment(p);
				}

				supplierOrder.status = OrderStatus.CANCELED;
				supplierOrder.fulfillment_status =
					FulfillSupplierOrderStt.NOT_FULFILLED;
				supplierOrder.payment_status = PaymentStatus.CANCELED;
				supplierOrder.canceled_at = new Date();

				const supplierOrderRepo = transactionManager.withRepository(
					this.supplierOrderRepository_
				);
				const result = await supplierOrderRepo.save(supplierOrder);

				await this.eventBus_
					.withTransaction(transactionManager)
					.emit(SupplierOrderService.Events.CANCELED, {
						id: supplierOrder.id,
						no_notification: supplierOrder.no_notification,
					});
				return result;
			}
		);
	}

	/**
	 * Captures payment for an order.
	 * @param orderId - id of order to capture payment for.
	 * @return result of the update operation.
	 */
	async capturePayment(supplierOrderId: string): Promise<SupplierOrder> {
		return await this.atomicPhase_(
			async (transactionManager: EntityManager) => {
				const supplierOrderRepo = transactionManager.withRepository(
					this.supplierOrderRepository_
				);
				const supplierOrder = await this.retrieve(supplierOrderId, {
					relations: ['payments'],
				});

				if (supplierOrder.status === 'canceled') {
					throw new MedusaError(
						MedusaError.Types.NOT_ALLOWED,
						'A canceled order cannot capture payment'
					);
				}

				const paymentProviderServiceTx =
					this.paymentProviderService_.withTransaction(transactionManager);

				const payments: Payment[] = [];
				for (const p of supplierOrder.payments) {
					if (p.captured_at === null) {
						const result = await paymentProviderServiceTx
							.capturePayment(p)
							.catch(async (err) => {
								await this.eventBus_
									.withTransaction(transactionManager)
									.emit(SupplierOrderService.Events.PAYMENT_CAPTURE_FAILED, {
										id: supplierOrder.id,
										payment_id: p.id,
										error: err,
										no_notification: supplierOrder.no_notification,
									});
							});

						if (result) {
							payments.push(result);
						} else {
							payments.push(p);
						}
					} else {
						payments.push(p);
					}
				}

				supplierOrder.payments = payments;
				supplierOrder.payment_status = payments.every(
					(p) => p.captured_at !== null
				)
					? PaymentStatus.CAPTURED
					: PaymentStatus.REQUIRES_ACTION;

				const result = await supplierOrderRepo.save(supplierOrder);

				if (supplierOrder.payment_status === PaymentStatus.CAPTURED) {
					await this.eventBus_
						.withTransaction(transactionManager)
						.emit(SupplierOrderService.Events.PAYMENT_CAPTURED, {
							id: result.id,
							no_notification: supplierOrder.no_notification,
						});
				}

				return result;
			}
		);
	}

	async retrieveLineItemsById(
		supplierOrderId: string
	): Promise<LineItem[] | undefined> {
		const lineItemRepo = this.activeManager_.withRepository(
			this.lineItemRepository_
		);

		const lineItems = await lineItemRepo.find({
			where: { supplier_order_id: supplierOrderId } as any,
		});
		return lineItems;
	}

	/**
	 * Gets an order by cart id.
	 * @param cartId - cart id to find order
	 * @param config - the config to be used to find order
	 * @return the order document
	 */
	async retrieveByCartId(
		cartId: string,
		config: FindConfig<SupplierOrder> = {}
	): Promise<SupplierOrder> {
		const supplierOrderRepo = this.activeManager_.withRepository(
			this.supplierOrderRepository_
		);

		const { select, relations, totalsToSelect } =
			this.transformQueryForTotals(config);

		const query = {
			where: { cart_id: cartId },
		} as FindConfig<SupplierOrder>;

		if (relations && relations.length > 0) {
			query.relations = relations;
		}

		query.select = select?.length ? select : undefined;

		const raw = await supplierOrderRepo.findOne(query);

		if (!raw) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`Order with cart id: ${cartId} was not found`
			);
		}

		if (!totalsToSelect?.length) {
			return raw;
		}

		return await this.decorateTotals(raw, totalsToSelect);
	}

	/**
	 * @param supplierOrderId - id of the order to complete
	 * @return the result of the find operation
	 */
	async completeSupplierOrder(supplierOrderId: string): Promise<SupplierOrder> {
		return await this.atomicPhase_(
			async (transactionManager: EntityManager) => {
				const supplierOrder = await this.retrieve(supplierOrderId);

				const supplierOrderRepo = transactionManager.withRepository(
					this.supplierOrderRepository_
				);

				if (supplierOrder.status === 'canceled') {
					throw new MedusaError(
						MedusaError.Types.NOT_ALLOWED,
						'A canceled order cannot be completed'
					);
				}

				await this.eventBus_
					.withTransaction(transactionManager)
					.emit(SupplierOrderService.Events.COMPLETED, {
						id: supplierOrderId,
						no_notification: supplierOrder.no_notification,
					});

				supplierOrder.status = OrderStatus.COMPLETED;

				const result = await supplierOrderRepo.save(supplierOrder);
				return result;
			}
		);
	}

	/**
	 * Refunds a given amount back to the customer.
	 * @param supplierOrderId - id of the order to refund.
	 * @param refundAmount - the amount to refund.
	 * @param reason - the reason to refund.
	 * @param note - note for refund.
	 * @param config - the config for refund.
	 * @return the result of the refund operation.
	 */
	async createRefund(
		supplierOrderId: string,
		refundAmount: number,
		reason: string,
		note?: string,
		config: { no_notification?: boolean } = {
			no_notification: undefined,
		}
	): Promise<SupplierOrder> {
		const { no_notification } = config;

		return await this.atomicPhase_(
			async (transactionManager: EntityManager) => {
				const supplierOrderRepository = transactionManager.withRepository(
					this.supplierOrderRepository_
				);

				const supplierOrder = await this.retrieve(supplierOrderId, {
					relations: ['payments'],
				});

				if (supplierOrder.status === 'canceled') {
					throw new MedusaError(
						MedusaError.Types.NOT_ALLOWED,
						'A canceled order cannot be refunded'
					);
				}

				if (refundAmount > supplierOrder.refundable_amount) {
					throw new MedusaError(
						MedusaError.Types.NOT_ALLOWED,
						'Cannot refund more than the original order amount'
					);
				}

				const refund = await this.myPaymentProviderService_
					.withTransaction(transactionManager)
					.refundSupplierPayment(
						supplierOrder.payments,
						refundAmount,
						reason,
						note
					);

				let result = await this.retrieveWithTotals(supplierOrderId, {
					relations: ['payments'],
				});

				if (result.refunded_total > 0 && result.refundable_amount > 0) {
					result.payment_status = PaymentStatus.PARTIALLY_REFUNDED;
					result = await supplierOrderRepository.save(result);
				}

				if (
					result.paid_total > 0 &&
					result.refunded_total === result.paid_total
				) {
					result.payment_status = PaymentStatus.REFUNDED;
					result = await supplierOrderRepository.save(result);
				}

				const evaluatedNoNotification =
					no_notification !== undefined
						? no_notification
						: supplierOrder.no_notification;

				await this.eventBus_
					.withTransaction(transactionManager)
					.emit(SupplierOrderService.Events.REFUND_CREATED, {
						id: result.id,
						refund_id: refund.id,
						no_notification: evaluatedNoNotification,
					});
				return result;
			}
		);
	}

	async decorateTotals(
		supplierOrder: SupplierOrder,
		totalsFields?: string[]
	): Promise<SupplierOrder>;

	async decorateTotals(
		supplierOrder: SupplierOrder,
		context?: TotalsContext
	): Promise<SupplierOrder>;

	/**
	 * Calculate and attach the different total fields on the object
	 * @param supplierOrder
	 * @param totalsFieldsOrContext
	 */
	async decorateTotals(
		supplierOrder: SupplierOrder,
		totalsFieldsOrContext?: string[] | TotalsContext
	): Promise<SupplierOrder> {
		supplierOrder.subtotal = 0;

		supplierOrder.refunded_total =
			Math.round(
				supplierOrder.refunds?.reduce((acc, next) => acc + next.amount, 0)
			) || 0;
		supplierOrder.paid_total =
			supplierOrder.payments?.reduce((acc, next) => (acc += next.amount), 0) ||
			0;
		supplierOrder.refundable_amount =
			supplierOrder.paid_total - supplierOrder.refunded_total || 0;

		let item_tax_total = 0;

		supplierOrder.items = (supplierOrder.items || []).map((item) => {
			item.quantity = item.quantity - (item.returned_quantity || 0);

			item.subtotal = item.unit_price * item.quantity;
			supplierOrder.subtotal += item.subtotal ?? 0;

			return item;
		});

		supplierOrder.tax_total = item_tax_total;

		supplierOrder.total = supplierOrder.subtotal + supplierOrder.tax_total;

		return supplierOrder;
	}

	async updateFulfillmentStatus(
		supplierOrderId: string,
		status: FulfillSupplierOrderStt
	): Promise<SupplierOrder> {
		return await this.atomicPhase_(
			async (transactionManager: EntityManager) => {
				const supplierOrder = await this.retrieve(supplierOrderId);

				if (!supplierOrder) {
					throw new MedusaError(
						MedusaError.Types.NOT_FOUND,
						`Supplier order with id ${supplierOrderId} not found`
					);
				}

				// Validate status transitions
				const validTransitions = this.getValidFulfillmentTransitions(
					supplierOrder.fulfillment_status
				);
				if (!validTransitions.includes(status)) {
					throw new MedusaError(
						MedusaError.Types.NOT_ALLOWED,
						`Cannot transition fulfillment status from ${supplierOrder.fulfillment_status} to ${status}`
					);
				}

				const supplierOrderRepo = transactionManager.withRepository(
					this.supplierOrderRepository_
				);

				// Update the fulfillment status
				supplierOrder.fulfillment_status = status;

				// Set the appropriate timestamp based on the new status
				switch (status) {
					case FulfillSupplierOrderStt.DELIVERED:
						supplierOrder.delivered_at = new Date();
						break;

					case FulfillSupplierOrderStt.INVENTORIED:
						// Only set inventoried_at if it's not already set
						if (!supplierOrder.inventoried_at) {
							supplierOrder.inventoried_at = new Date();
						}
						break;

					case FulfillSupplierOrderStt.REJECTED:
						supplierOrder.rejected_at = new Date();
						break;

					case FulfillSupplierOrderStt.NOT_FULFILLED:
						// Reset all timestamps when moving back to not fulfilled
						supplierOrder.delivered_at = null;
						supplierOrder.inventoried_at = null;
						supplierOrder.rejected_at = null;
						break;
				}

				const result = await supplierOrderRepo.save(supplierOrder);

				// Emit appropriate events based on the new status
				await this.eventBus_
					.withTransaction(transactionManager)
					.emit(SupplierOrderService.Events.FULFILLMENT_CREATED, {
						id: result.id,
						fulfillment_status: status,
						no_notification: supplierOrder.no_notification,
					});

				return result;
			}
		);
	}

	/**
	 * Helper method to determine valid fulfillment status transitions
	 */
	private getValidFulfillmentTransitions(
		currentStatus: FulfillSupplierOrderStt
	): FulfillSupplierOrderStt[] {
		const statusTransitions = {
			[FulfillSupplierOrderStt.NOT_FULFILLED]: [
				FulfillSupplierOrderStt.DELIVERED,
				FulfillSupplierOrderStt.REJECTED,
			],
			[FulfillSupplierOrderStt.DELIVERED]: [
				FulfillSupplierOrderStt.INVENTORIED,
				FulfillSupplierOrderStt.REJECTED,
			],
			[FulfillSupplierOrderStt.INVENTORIED]: [FulfillSupplierOrderStt.REJECTED],
			[FulfillSupplierOrderStt.REJECTED]: [
				FulfillSupplierOrderStt.DELIVERED,
				FulfillSupplierOrderStt.INVENTORIED,
			],
		};

		return statusTransitions[currentStatus] || [];
	}

	private getTotalsRelations(config: FindConfig<SupplierOrder>): string[] {
		const relationSet = new Set(config.relations);

		relationSet.add('items');
		relationSet.add('items.tax_lines');
		relationSet.add('items.adjustments');
		relationSet.add('items.variant');
		relationSet.add('region');
		relationSet.add('refunds');
		relationSet.add('payments');

		return Array.from(relationSet.values());
	}
}

export default SupplierOrderService;
