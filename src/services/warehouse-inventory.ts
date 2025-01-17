import {
	buildQuery,
	FindConfig,
	Selector,
	TransactionBaseService,
} from '@medusajs/medusa';
import { WarehouseInventory } from 'src/models/warehouse-inventory';
import ProductVariantRepository from 'src/repositories/product-variant';
import WarehouseInventoryRepository from 'src/repositories/warehouse-inventory';
import { FilterableWarehouseProps } from 'src/types/warehouse';
import { EntityManager } from 'typeorm';

type InjectedDependencies = {
	manager: EntityManager;
	warehouseInventoryRepository: typeof WarehouseInventoryRepository;
	productVariantRepository: typeof ProductVariantRepository;
};

class WarehouseInventoryService extends TransactionBaseService {
	protected readonly warehouseInventoryRepository_: typeof WarehouseInventoryRepository;
	protected readonly productVariantRepository_: typeof ProductVariantRepository;

	constructor({
		warehouseInventoryRepository,
		productVariantRepository,
	}: InjectedDependencies) {
		super(arguments[0]);
		this.warehouseInventoryRepository_ = warehouseInventoryRepository;
		this.productVariantRepository_ = productVariantRepository;
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
				order: { created_at: 'ASC' },
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

	async retrieveByWarehouseAndVariant(
		warehouseId: string,
		variantId: string,
		unitId: string
	): Promise<WarehouseInventory | undefined> {
		return await this.atomicPhase_(async (manager: EntityManager) => {
			const warehouseInventoryRepo = manager.withRepository(
				this.warehouseInventoryRepository_
			);
			const warehouseInventory = await warehouseInventoryRepo.findOne({
				where: {
					warehouse_id: warehouseId,
					variant_id: variantId,
					unit_id: unitId,
				},
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
		variant_id: string;
		quantity: number;
	}): Promise<WarehouseInventory> {
		return await this.atomicPhase_(async (manager: EntityManager) => {
			const warehouseInventoryRepo = manager.withRepository(
				this.warehouseInventoryRepository_
			);
			const warehouseInventory = await warehouseInventoryRepo.findOne({
				where: { variant_id: data.variant_id },
			});

			if (warehouseInventory) {
				warehouseInventory.quantity = data.quantity;
			}

			return await warehouseInventoryRepo.save(warehouseInventory);
		});
	}

	async listInventoryDifferenceVariants(
		selector: Selector<FilterableWarehouseProps> & { q?: string } = {},
		config: FindConfig<FilterableWarehouseProps> = {
			skip: 0,
			take: 50,
		}
	) {
		const productVariantRepository = this.activeManager_.withRepository(
			this.productVariantRepository_
		);
		let q: string | undefined;
		if (selector.q) {
			q = selector.q;
			delete selector.q;
		}
		const query = buildQuery(selector, config);

		const { data } =
			await productVariantRepository.getTotalQuantityWithVariantDetails({
				...query,
				q,
			});

		return { data };
	}
}

export default WarehouseInventoryService;
