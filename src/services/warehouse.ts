import { TransactionBaseService } from '@medusajs/medusa';
import { Warehouse } from 'src/models/warehouse';
import WarehouseRepository from 'src/repositories/warehouse';
import { EntityManager } from 'typeorm';

type InjectedDependencies = {
	manager: EntityManager;
	warehouseRepository: typeof WarehouseRepository;
};

class WarehouseService extends TransactionBaseService {
	protected warehouseRepository_: typeof WarehouseRepository;
	constructor({ warehouseRepository }: InjectedDependencies) {
		super(arguments[0]);

		this.warehouseRepository_ = warehouseRepository;
	}

	async listAndCount(
		filter: Partial<Warehouse> = {},
		options = { skip: 0, take: 10 }
	) {
		const warehouseRepo = this.activeManager_.withRepository(
			this.warehouseRepository_
		);

		const [warehouses, count] = await warehouseRepo.findAndCount({
			where: filter,
			skip: options.skip,
			take: options.take,
			order: { created_at: 'ASC' },
		});

		return [warehouses, count];
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
