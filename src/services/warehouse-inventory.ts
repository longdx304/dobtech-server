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

	async getByVariant(variantId: string): Promise<WarehouseInventory[]> {
		return await this.atomicPhase_(async (manager: EntityManager) => {
			const warehouseInventoryRepo = manager.withRepository(
				this.warehouseInventoryRepository_
			);

			const warehouseInventory = await warehouseInventoryRepo.find({
				where: { variant_id: variantId },
				relations: ['warehouse', 'item_unit'],
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

	async retrieve(id: string): Promise<WarehouseInventory | undefined> {
		return await this.atomicPhase_(async (manager: EntityManager) => {
			const warehouseInventoryRepo = manager.withRepository(
				this.warehouseInventoryRepository_
			);
			const warehouseInventory = await warehouseInventoryRepo.findOne({
				where: { id },
				relations: ['warehouse', 'item_unit'],
			});
			return warehouseInventory;
		});
	}

	async findOneById(
		params: Partial<WarehouseInventory>
	): Promise<WarehouseInventory | undefined> {
		return await this.atomicPhase_(async (manager: EntityManager) => {
			const warehouseInventoryRepo = manager.withRepository(
				this.warehouseInventoryRepository_
			);
			const warehouseInventory = await warehouseInventoryRepo.findOne({
				where: { ...params },
			});
			return warehouseInventory;
		});
	}

	async createUnitWithVariant(data: {
		warehouse_id: string;
		unit_id: string;
		variant_id: string;
		quantity: number;
	}): Promise<WarehouseInventory> {
		return await this.atomicPhase_(async (manager: EntityManager) => {
			const warehouseInventoryRepo = manager.withRepository(
				this.warehouseInventoryRepository_
			);

			const warehouseInventory = warehouseInventoryRepo.create({
				warehouse_id: data.warehouse_id,
				unit_id: data.unit_id,
				variant_id: data.variant_id,
				quantity: data.quantity,
			});

			return await warehouseInventoryRepo.save(warehouseInventory);
		});
	}
	async updateUnitWithVariant(data: {
		unit_id: string;
		variant_id: string;
		quantity: number;
	}): Promise<WarehouseInventory> {
		return await this.atomicPhase_(async (manager: EntityManager) => {
			const warehouseInventoryRepo = manager.withRepository(
				this.warehouseInventoryRepository_
			);
			const warehouseInventory = await warehouseInventoryRepo.findOne({
				where: { variant_id: data.variant_id, unit_id: data.unit_id },
			});

			if (warehouseInventory) {
				warehouseInventory.quantity = data.quantity;
			}

			return await warehouseInventoryRepo.save(warehouseInventory);
		});
	}
}

export default WarehouseInventoryService;
