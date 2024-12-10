import { MedusaError } from '@medusajs/utils';
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
import WarehouseInventoryRepository from 'src/repositories/warehouse-inventory';

type InjectedDependencies = {
	manager: EntityManager;
	warehouseRepository: typeof WarehouseRepository;
	warehouseInventoryRepository: typeof WarehouseInventoryRepository;
	warehouseInventoryService: WarehouseInventoryService;
};

class WarehouseService extends TransactionBaseService {
	protected warehouseRepository_: typeof WarehouseRepository;
	protected warehouseInventoryRepository_: typeof WarehouseInventoryRepository;
	protected warehouseInventoryService_: WarehouseInventoryService;
	constructor({
		warehouseRepository,
		warehouseInventoryRepository,
		warehouseInventoryService,
	}: InjectedDependencies) {
		super(arguments[0]);

		this.warehouseRepository_ = warehouseRepository;
		this.warehouseInventoryRepository_ = warehouseInventoryRepository;
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

	async createWarehouseWithVariant(
		data: CreateWarehouseWithVariant
	): Promise<Warehouse> {
		return await this.atomicPhase_(
			async (transactionManager: EntityManager) => {
				const warehouseRepo = transactionManager.withRepository(
					this.warehouseRepository_
				);
				const warehouseInventoryRepo = transactionManager.withRepository(
					this.warehouseInventoryRepository_
				);

				const warehouseInventoryServiceTx =
					this.warehouseInventoryService_.withTransaction(transactionManager);

				let warehouse: Warehouse;

				// If warehouse_id is provided, retrieve the existing warehouse
				if (data.warehouse_id) {
					warehouse = await warehouseRepo.findOne({
						where: { id: data.warehouse_id },
					});

					if (!warehouse) {
						throw new MedusaError(
							MedusaError.Types.INVALID_DATA,
							`Không tìm thấy kho với id ${data.warehouse_id}`
						);
					}
				} else {
					// Check if a warehouse with the same location already exists
					const existingWarehouse = await warehouseRepo.findOne({
						where: { location: data.location },
					});

					if (existingWarehouse) {
						// Use existing warehouse
						warehouse = existingWarehouse;
					} else {
						// Create new warehouse
						warehouse = warehouseRepo.create({
							location: data.location,
						});
						warehouse = await warehouseRepo.save(warehouse);
					}
				}

				// Check if warehouse inventory already exists for this variant
				const existingWarehouseInventory = await warehouseInventoryRepo.findOne(
					{
						where: {
							warehouse_id: warehouse.id,
							variant_id: data.variant_id,
							unit_id: data.unit_id,
						},
					}
				);

				// If warehouse inventory exists, throw an error
				if (existingWarehouseInventory) {
					throw new MedusaError(
						MedusaError.Types.DUPLICATE_ERROR,
						`Vị trí này đã tạo trong kho với biến thể này`
					);
				}

				// Create Warehouse Inventory
				await warehouseInventoryServiceTx.create({
					warehouse_id: warehouse.id,
					variant_id: data.variant_id,
					unit_id: data.unit_id,
				});
				return warehouse;
			}
		);
	}

	async retrieve(id: string): Promise<Warehouse> {
		const warehouseRepo = this.activeManager_.withRepository(
			this.warehouseRepository_
		);

		const warehouse = await warehouseRepo.findOne({
			where: { id },
			relations: ['inventories'],
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
