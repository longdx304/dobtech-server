import { TransactionBaseService } from '@medusajs/medusa';
import { WarehouseInventory } from 'src/models/warehouse-inventory';
import WarehouseInventoryRepository from 'src/repositories/warehouse-inventory';
import { EntityManager } from 'typeorm';

type InjectedDependencies = {
	manager: EntityManager;
	warehouseInventoryRepository: typeof WarehouseInventoryRepository;
};

class WarehouseInventoryService extends TransactionBaseService {
	protected readonly warehouseInventoryRepository_: typeof WarehouseInventoryRepository;

	constructor({ warehouseInventoryRepository }: InjectedDependencies) {
		super(arguments[0]);
		this.warehouseInventoryRepository_ = warehouseInventoryRepository;
	}

	async create(data: Partial<WarehouseInventory>): Promise<WarehouseInventory> {
		return await this.atomicPhase_(async (manager: EntityManager) => {
			const warehouseInventoryRepo = manager.withRepository(
				this.warehouseInventoryRepository_
			);
			const warehouseInventory = warehouseInventoryRepo.create(data);
			return await warehouseInventoryRepo.save(warehouseInventory);
		});
	}

	async retrieve(id: string): Promise<WarehouseInventory> {
		return await this.atomicPhase_(async (manager: EntityManager) => {
			const warehouseInventoryRepo = manager.withRepository(
				this.warehouseInventoryRepository_
			);

			const warehouseInventory = await warehouseInventoryRepo.findOne({
				where: { id },
			});

			if (!warehouseInventory) {
				throw new Error('Warehouse inventory not found');
			}
			return warehouseInventory;
		});
	}

	async update(
		id: string,
		data: Partial<WarehouseInventory>
	): Promise<WarehouseInventory> {
		return await this.atomicPhase_(async (manager: EntityManager) => {
			const warehouseInventoryRepo = manager.withRepository(
				this.warehouseInventoryRepository_
			);
			const warehouseInventory = await warehouseInventoryRepo.findOne({
				where: { id },
			});
			if (!warehouseInventory) {
				throw new Error('Warehouse inventory not found');
			}
			Object.assign(warehouseInventory, data);
			return await warehouseInventoryRepo.save(warehouseInventory);
		});
	}

	async delete(id: string): Promise<void> {
		return await this.atomicPhase_(async (manager: EntityManager) => {
			const warehouseInventoryRepo = manager.withRepository(
				this.warehouseInventoryRepository_
			);
			await warehouseInventoryRepo.delete({ id });
		});
	}
}

export default WarehouseInventoryService;
