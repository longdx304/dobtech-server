import {
	buildQuery,
	FindConfig,
	Selector,
	TransactionBaseService,
} from '@medusajs/medusa';
import { Warehouse } from 'src/models/warehouse';
import WarehouseRepository from 'src/repositories/warehouse';
import {
	CreateWarehouseWithVariant,
	FilterableWarehouseProps,
} from 'src/types/warehouse';
import { EntityManager, FindOptionsWhere, ILike } from 'typeorm';
import WarehouseInventoryService from './warehouse-inventory';

type InjectedDependencies = {
	manager: EntityManager;
	warehouseRepository: typeof WarehouseRepository;
	warehouseInventoryService: WarehouseInventoryService;
};

class WarehouseService extends TransactionBaseService {
	protected warehouseRepository_: typeof WarehouseRepository;
	protected warehouseInventoryService_: WarehouseInventoryService;
	constructor({
		warehouseRepository,
		warehouseInventoryService,
	}: InjectedDependencies) {
		super(arguments[0]);

		this.warehouseRepository_ = warehouseRepository;
		this.warehouseInventoryService_ = warehouseInventoryService;
	}

	async listAndCount(
		selector: Selector<FilterableWarehouseProps> & { q?: string } = {},
		config: FindConfig<FilterableWarehouseProps> = { skip: 0, take: 50 }
	) {
		const warehouseRepo = this.activeManager_.withRepository(
			this.warehouseRepository_
		);

		let q: string | undefined;

		if (selector.q) {
			q = selector.q;
			delete selector.q;
		}

		const query = buildQuery(selector, config);

		if (q) {
			const where = query.where as FindOptionsWhere<FilterableWarehouseProps>;

			delete where.location;
			query.where = [
				{
					...where,
					location: ILike(`%${q}%`),
				},
			];
		}

		return await warehouseRepo.findAndCount(query);
	}

	async create(data: Partial<Warehouse>): Promise<Warehouse> {
		return await this.atomicPhase_(
			async (transactionManager: EntityManager) => {
				const warehouseRepo = transactionManager.withRepository(
					this.warehouseRepository_
				);

				// Check if a warehouse with the same locations already exists
				const existingWarehouse = await warehouseRepo.findOne({
					where: { location: data.location },
				});

				if (existingWarehouse) {
					throw new Error('A warehouse with this location already exists');
				}

				const warehouse = warehouseRepo.create(data);
				return await warehouseRepo.save(warehouse);
			}
		);
	}

	async createWithVariants(
		data: CreateWarehouseWithVariant
	): Promise<Warehouse> {
		return await this.atomicPhase_(
			async (transactionManager: EntityManager) => {
				const warehouseRepo = transactionManager.withRepository(
					this.warehouseRepository_
				);

				const warehouseInventoryServiceTx =
					this.warehouseInventoryService_.withTransaction(transactionManager);

				// Create Warehouse
				const { variant_id, ...warehouseData } = data;
				const warehouse = warehouseRepo.create(warehouseData);
				const savedWarehouse = await warehouseRepo.save(warehouse);

				// Create associated WarehouseInventory
				if (variant_id) {
					await warehouseInventoryServiceTx.create({
						warehouse_id: savedWarehouse.id,
						variant_id: variant_id,
					});
				}

				return savedWarehouse;
			}
		);
	}

	async retrieve(id: string): Promise<Warehouse> {
		const warehouseRepo = this.activeManager_.withRepository(
			this.warehouseRepository_
		);

		const warehouse = await warehouseRepo.findOne({
			where: { id },
		});

		if (!warehouse) {
			throw new Error(`Warehouse with ID ${id} not found`);
		}

		return warehouse;
	}
	async update(id: string, data: Partial<Warehouse>): Promise<Warehouse> {
		const warehouse = await this.retrieve(id);

		Object.assign(warehouse, data);
		return await this.warehouseRepository_.save(warehouse);
	}

	async delete(id: string): Promise<void> {
		const warehouseRepo = this.activeManager_.withRepository(
			this.warehouseRepository_
		);

		await warehouseRepo.delete(id);
	}
}

export default WarehouseService;
