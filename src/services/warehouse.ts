import {
	buildQuery,
	FindConfig,
	Selector,
	TransactionBaseService,
} from '@medusajs/medusa';
import { MedusaError } from '@medusajs/utils';
import { Warehouse } from 'src/models/warehouse';
import WarehouseRepository from 'src/repositories/warehouse';
import WarehouseInventoryRepository from 'src/repositories/warehouse-inventory';
import {
	AdminPostItemInventory,
	CreateWarehouseWithVariant,
	FilterableWarehouseProps,
} from 'src/types/warehouse';
import { EntityManager, FindOptionsWhere, ILike } from 'typeorm';
import WarehouseInventoryService from './warehouse-inventory';
import ItemUnitService from './item-unit';

type InjectedDependencies = {
	manager: EntityManager;
	warehouseRepository: typeof WarehouseRepository;
	warehouseInventoryRepository: typeof WarehouseInventoryRepository;
	warehouseInventoryService: WarehouseInventoryService;
	itemUnitService: ItemUnitService;
};

class WarehouseService extends TransactionBaseService {
	protected warehouseRepository_: typeof WarehouseRepository;
	protected warehouseInventoryRepository_: typeof WarehouseInventoryRepository;
	protected warehouseInventoryService_: WarehouseInventoryService;
	protected itemUnitService_: ItemUnitService;

	constructor({
		warehouseRepository,
		warehouseInventoryRepository,
		warehouseInventoryService,
		itemUnitService,
	}: InjectedDependencies) {
		super(arguments[0]);

		this.warehouseRepository_ = warehouseRepository;
		this.warehouseInventoryRepository_ = warehouseInventoryRepository;
		this.warehouseInventoryService_ = warehouseInventoryService;
		this.itemUnitService_ = itemUnitService;
	}

	async listAndCount(
		selector: Selector<FilterableWarehouseProps> & { q?: string } = {},
		config: FindConfig<FilterableWarehouseProps> = {
			skip: 0,
			take: 50,
		}
	) {
		const warehouseRepo = this.activeManager_.withRepository(
			this.warehouseRepository_
		);

		let q: string | undefined;

		if (selector.q) {
			q = selector.q;
			delete selector.q;
		}
		config.order = {
			...config.order,
			updated_at: 'DESC',
		};

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

				if (!data.location) {
					throw new MedusaError(
						MedusaError.Types.INVALID_DATA,
						'Vui lòng cung cấp vị trí kho'
					);
				}
				// Check if a warehouse with the same locations already exists
				const existingWarehouse = await warehouseRepo.findOne({
					where: { location: data.location },
				});

				if (existingWarehouse) {
					throw new MedusaError(
						MedusaError.Types.DUPLICATE_ERROR,
						'Kho với vị trí này đã tồn tại'
					);
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

	async addVariantIntoWarehouse(
		dataWarehouse: CreateWarehouseWithVariant,
		dataItemInventory: AdminPostItemInventory,
		user_id: string
	) {
		return this.atomicPhase_(async (manager: EntityManager) => {
			const warehouseInventoryServiceTx =
				this.warehouseInventoryService_.withTransaction(manager);

			const warehouseVariant = await this.createWarehouseWithVariant(
				dataWarehouse
			);
			console.log('warehouseVariant:', warehouseVariant);

			// retrieve warehouse
			const warehouseInventory =
				await warehouseInventoryServiceTx.retrieveByWarehouseAndVariant(
					warehouseVariant.id,
					dataItemInventory.variant_id,
					dataWarehouse.unit_id
				);
			console.log('warehouseInventory:', warehouseInventory);

			return { warehouseVariant, warehouseInventory };
		});
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

		const warehouse = await this.retrieve(id);
		if (warehouse?.inventories?.length > 0) {
			throw new MedusaError(
				MedusaError.Types.NOT_ALLOWED,
				'Không thể xóa kho đã có hàng trong kho'
			);
		}
		await warehouseRepo.delete(id);
	}

	async updateWarehouseWithVariantFromFire(payload: Record<string, any>) {
		return this.atomicPhase_(async (manager: EntityManager) => {
			const warehouseInventoryServiceTx =
				this.warehouseInventoryService_.withTransaction(manager);

			const itemUnitServiceTx = this.itemUnitService_.withTransaction(manager);

			const warehouseRepo = manager.withRepository(this.warehouseRepository_);
			const warehouseInventoryRepo = manager.withRepository(
				this.warehouseInventoryRepository_
			);

			const warehouse = await warehouseRepo.find();
			const itemUnits = await itemUnitServiceTx.list();

			const warehouseInventory = await warehouseInventoryRepo.find();

			const warehouseInventoryMap = new Map();
			const itemUnitMap = new Map();

			warehouseInventory.forEach((item) => {
				const key = `${item.warehouse_id}_${item.variant_id}_${item.unit_id}`;
				warehouseInventoryMap.set(key, item);
			});

			itemUnits.forEach((item) => {
				itemUnitMap.set(item.unit, item);
			});

			for (const key in payload) {
				// Check key is warehouse location
				const isWarehouseExist = warehouse.find(
					(item) => item.location === key
				);
				const warehouseData = payload[key];

				// Find the warehouse location if not exist, create new warehouse
				let warehouseId = null;
				if (!isWarehouseExist) {
					const newWarehouse = await warehouseRepo.create({ location: key });
					const warehouse = await warehouseRepo.save(newWarehouse);
					warehouseId = warehouse.id;
				} else {
					warehouseId = isWarehouseExist.id;
				}

				// Loop through warehouse data
				for (const item of warehouseData) {
					const unit = itemUnitMap.get(item.unit);
					if (!unit) {
						continue;
					}
					const key = `${warehouseId}_${item.variant_id}_${unit.id}`;
					const warehouseInventory = warehouseInventoryMap.get(key);

					if (warehouseInventory) {
						if (warehouseInventory.quantity !== item.quantity * unit.quantity) {
							// Update warehouse inventory
							await warehouseInventoryServiceTx.update(warehouseInventory.id, {
								quantity: item.quantity * unit.quantity,
							});
						}
					} else {
						// Create new warehouse inventory
						await warehouseInventoryServiceTx.create({
							warehouse_id: warehouseId,
							variant_id: item.variant_id,
							unit_id: unit.id,
							quantity: item.quantity * unit.quantity,
						});
					}
				}
			}
		});
	}
}

export default WarehouseService;
