import { EntityManager, FindManyOptions, IsNull, Not } from 'typeorm';

import {
	buildQuery,
	FindConfig,
	LineItemService,
	OrderService,
	QuerySelector,
	TransactionBaseService,
} from '@medusajs/medusa';
import LineItemRepository from '@medusajs/medusa/dist/repositories/line-item';
import { isDefined, MedusaError } from '@medusajs/utils';
import { UpdateFulfillment, FulfullmentStatus } from '../types/fulfillment';
import { Fulfillment } from '../models/fulfillment';
import FulfillmentRepository from 'src/repositories/fulfillment';

type InjectedDependencies = {
	manager: EntityManager;
	fulfillmentRepository: typeof FulfillmentRepository;
	lineItemService: LineItemService;
	lineItemRepository: typeof LineItemRepository;
	orderService: OrderService;
};

class MyFulfillmentService extends TransactionBaseService {
	protected readonly fulfillmentRepository_: typeof FulfillmentRepository;
	protected readonly lineItemService_: LineItemService;
	protected readonly lineItemRepository_: typeof LineItemRepository;
	protected readonly orderService_: OrderService;

	constructor({
		fulfillmentRepository,
		lineItemService,
		lineItemRepository,
		orderService,
	}: InjectedDependencies) {
		super(arguments[0]);

		this.fulfillmentRepository_ = fulfillmentRepository;
		this.lineItemService_ = lineItemService;
		this.lineItemRepository_ = lineItemRepository;
		this.orderService_ = orderService;
	}

	async listAndCount(
		selector: QuerySelector<Fulfillment>,
		config: FindConfig<Fulfillment> = {
			skip: 0,
			take: 20,
			relations: ['order'],
		},
		isShipment: boolean = false
	) {
		const fulfillmentRepo = this.activeManager_.withRepository(
			this.fulfillmentRepository_
		);

		const { q, ...fulfillmentSelectorRest } = selector;

		config.order = config.order || {
			created_at: 'DESC',
		};

		const query = buildQuery(
			fulfillmentSelectorRest,
			config
		) as FindManyOptions<Fulfillment>;

		// filter data with checked_at
		if (isShipment) {
			query.where = {
				...query.where,
				checked_at: Not(IsNull()),
			};
		} else {
			query.where = {
				...query.where,
				checked_at: IsNull(),
			};
		}
		// Fetch fulfillments with related data
		const [fulfillments, count] = await fulfillmentRepo.findAndCount(query);

		return [fulfillments, count];
	}

	async retrieve(
		id: string,
		config: FindConfig<Fulfillment> = {}
	): Promise<Fulfillment | undefined> {
		if (!isDefined(id)) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`
				"fulfillment_id" must be defined
				`
			);
		}
		const fulfillmentRepo = this.activeManager_.withRepository(
			this.fulfillmentRepository_
		);

		const query = buildQuery({ id: id }, config);

		if (!(config.select || []).length) {
			query.select = undefined;
		}

		const raw = await fulfillmentRepo.findOne(query);

		if (!raw) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`Order with id ${id} was not found`
			);
		}

		return raw;
	}

	async retrieveWithTotals(
		id: string,
		options: FindConfig<Fulfillment> = {}
	): Promise<Fulfillment> {
		const relations = this.getTotalsRelations(options);
		const fulfillment = await this.retrieve(id, {
			...options,
			relations,
		});

		return await this.decorateTotals(fulfillment);
	}

	async updateFulfillment(userId: string, id: string, data: UpdateFulfillment) {
		return await this.atomicPhase_(
			async (transactionManager: EntityManager) => {
				console.log('data:', data);
				const fulfillmentRepo = transactionManager.withRepository(
					this.fulfillmentRepository_
				);

				const fulfillment = await this.retrieve(id, {
					relations: ['order', 'items'],
				});

				if (!fulfillment) {
					throw new MedusaError(
						MedusaError.Types.NOT_FOUND,
						`Fulfillment với id ${id} không tìm thấy`
					);
				}

				if (data.checker_url) {
					data.checked_at = new Date();
					data.checker_id = userId;
				}

				if (data?.status === FulfullmentStatus.AWAITING) {
					data.shipped_id = null;
				}
				if (data?.status === FulfullmentStatus.DELIVERING) {
					data.shipped_id = userId;
				}
				if (data.shipped_url) {
					data.shipped_at = new Date();
					await this.orderService_.createShipment(fulfillment.order_id, id);
				}

				Object.assign(fulfillment, data);

				const result = await fulfillmentRepo.save(fulfillment);

				return result;
			}
		);
	}

	async decorateTotals(fulfillment: Fulfillment): Promise<Fulfillment> {
		return fulfillment;
	}

	private getTotalsRelations(config: FindConfig<Fulfillment>): string[] {
		const relationSet = new Set(config.relations);

		relationSet.add('order');
		relationSet.add('shipper');
		relationSet.add('checker');
		relationSet.add('items.item');
		relationSet.add('order.customer');
		relationSet.add('order.shipping_address');

		return Array.from(relationSet.values());
	}
}

export default MyFulfillmentService;
