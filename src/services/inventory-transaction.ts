import {
	FindConfig,
	LineItemService,
	ProductVariantService,
	Selector,
	TransactionBaseService,
} from '@medusajs/medusa';
import { buildQuery } from '@medusajs/utils';
import {
	InventoryTransaction,
	TransactionType,
} from 'src/models/inventory-transaction';
import InventoryTransactionRepository from 'src/repositories/inventory-transaction';
import WarehouseInventoryRepository from 'src/repositories/warehouse-inventory';
import {
	CreateInventoryTransaction,
	FilterableInventoryTransactionProps,
	ManageInventoryTransaction,
} from 'src/types/inventory-transaction';
import {
	Between,
	EntityManager,
	FindManyOptions,
	FindOptionsWhere,
	ILike,
} from 'typeorm';
import ItemUnitService from './item-unit';
import WarehouseService from './warehouse';
import WarehouseInventoryService from './warehouse-inventory';

type InjectedDependencies = {
	manager: EntityManager;
	inventoryTransactionRepository: typeof InventoryTransactionRepository;
	warehouseInventoryRepository: typeof WarehouseInventoryRepository;
	productVariantService: ProductVariantService;
	lineItemService: LineItemService;
	warehouseService: WarehouseService;
	warehouseInventoryService: WarehouseInventoryService;
	itemUnitService: ItemUnitService;
};

class InventoryTransactionService extends TransactionBaseService {
	protected readonly inventoryTransactionRepository_: typeof InventoryTransactionRepository;
	protected readonly warehouseInventoryRepository_: typeof WarehouseInventoryRepository;
	protected readonly productVariantService_: ProductVariantService;
	protected readonly lineItemService_: LineItemService;
	protected readonly warehouseService_: WarehouseService;
	protected readonly warehouseInventoryService_: WarehouseInventoryService;
	protected readonly itemUnitService_: ItemUnitService;

	constructor({
		inventoryTransactionRepository,
		warehouseInventoryRepository,
		productVariantService,
		lineItemService,
		warehouseService,
		warehouseInventoryService,
		itemUnitService,
	}: InjectedDependencies) {
		super(arguments[0]);
		this.inventoryTransactionRepository_ = inventoryTransactionRepository;
		this.warehouseInventoryRepository_ = warehouseInventoryRepository;
		this.productVariantService_ = productVariantService;
		this.lineItemService_ = lineItemService;
		this.warehouseService_ = warehouseService;
		this.warehouseInventoryService_ = warehouseInventoryService;
		this.itemUnitService_ = itemUnitService;
	}

	async create(data: Partial<CreateInventoryTransaction>) {
		return await this.atomicPhase_(async (manager: EntityManager) => {
			const inventoryTransactionRepo = manager.withRepository(
				this.inventoryTransactionRepository_
			);

			const warehouseInventoryServiceTx =
				this.warehouseInventoryService_.withTransaction(manager);

			const lineItemServiceTx = this.lineItemService_.withTransaction(manager);

			const itemUnitServiceTx = this.itemUnitService_.withTransaction(manager);

			// retrieve quantity of the item unit
			// to calculate the inventory quantity
			const retrievedUnit = await itemUnitServiceTx.retrieve(data.unit_id);
			const inventoryQuantity = data.quantity * retrievedUnit.quantity;

			// retrieve warehouse inventory
			const warehouseInventory = await warehouseInventoryServiceTx.retrieve(
				data.warehouse_inventory_id
			);

			if (warehouseInventory.item_unit) {
				if (warehouseInventory.item_unit.id !== data.unit_id) {
					await warehouseInventoryServiceTx.createUnitWithVariant({
						warehouse_id: warehouseInventory.warehouse_id,
						unit_id: data.unit_id,
						variant_id: data.variant_id,
						quantity: inventoryQuantity,
					});
				} else {
					await warehouseInventoryServiceTx.update(warehouseInventory.id, {
						quantity: warehouseInventory.quantity + inventoryQuantity,
					});
				}
			}

			// update fulfillment_quantity on the line item
			const lineItem = await lineItemServiceTx.retrieve(data.line_item_id);
			let updatedWarehouseQuantity =
				data.type === 'INBOUND'
					? lineItem.warehouse_quantity + inventoryQuantity
					: lineItem.warehouse_quantity - inventoryQuantity;

			await lineItemServiceTx.update(data.line_item_id, {
				warehouse_quantity: updatedWarehouseQuantity,
			});

			// create a new inventory transaction
			const inventoryTransaction = inventoryTransactionRepo.create({
				...data,
				type: data.type as TransactionType,
				quantity: inventoryQuantity,
				note: `Đã nhập kho ${data.quantity} ${retrievedUnit.unit} (${inventoryQuantity} đôi) vào vị trí ${warehouseInventory.warehouse.location}`,
				user_id: data.user_id,
			});

			await inventoryTransactionRepo.save(inventoryTransaction);

			return inventoryTransaction;
		});
	}

	async remove(data: CreateInventoryTransaction) {
		return await this.atomicPhase_(async (manager: EntityManager) => {
			const inventoryTransactionRepo = manager.withRepository(
				this.inventoryTransactionRepository_
			);

			const warehouseInventoryServiceTx =
				this.warehouseInventoryService_.withTransaction(manager);

			const lineItemServiceTx = this.lineItemService_.withTransaction(manager);

			const itemUnitServiceTx = this.itemUnitService_.withTransaction(manager);

			// retrieve quantity of the item unit
			// to calculate the inventory quantity
			const retrievedUnit = await itemUnitServiceTx.retrieve(data.unit_id);
			const inventoryQuantity = data.quantity * retrievedUnit.quantity;

			// update fulfillment_quantity on the line item
			const lineItem = await lineItemServiceTx.retrieve(data.line_item_id);

			let updatedWarehouseQuantity =
				data.type === 'INBOUND'
					? lineItem.warehouse_quantity - inventoryQuantity
					: lineItem.warehouse_quantity + inventoryQuantity;

			// retrieve warehouse inventory
			const warehouseInventory = await warehouseInventoryServiceTx.retrieve(
				data.warehouse_inventory_id
			);

			if (warehouseInventory.quantity - inventoryQuantity > 0) {
				await warehouseInventoryServiceTx.update(warehouseInventory.id, {
					quantity: warehouseInventory.quantity - inventoryQuantity,
				});
			} else {
				await warehouseInventoryServiceTx.delete(warehouseInventory.id);
			}

			await lineItemServiceTx.update(data.line_item_id, {
				warehouse_quantity: updatedWarehouseQuantity,
			});

			// create a new inventory transaction
			const inventoryTransaction = inventoryTransactionRepo.create({
				order_id: data.order_id,
				variant_id: data.variant_id,
				warehouse_id: data.warehouse_id,
				quantity: inventoryQuantity,
				type: data.type as TransactionType,
				note: `Đã xuất kho ${data.quantity} ${retrievedUnit.unit} (${inventoryQuantity} đôi) tại vị trí ${warehouseInventory.warehouse.location}`,
				user_id: data.user_id,
			});

			await inventoryTransactionRepo.save(inventoryTransaction);

			return inventoryTransaction;
		});
	}

	async listAndCount(
		selector: Selector<FilterableInventoryTransactionProps> & {
			q?: string;
			start_at?: Date;
			end_at?: Date;
			type?: string;
		} = {},
		config: FindConfig<FilterableInventoryTransactionProps> = {
			skip: 0,
			take: 50,
		}
	): Promise<[InventoryTransaction[], number]> {
		const inventoryTransactionRepo = this.activeManager_.withRepository(
			this.inventoryTransactionRepository_
		);

		let q: string | undefined;
		let startAt: Date | undefined;
		let endAt: Date | undefined;
		let type: string | undefined;

		if (selector.q) {
			q = selector.q;
			delete selector.q;
		}

		if (selector.start_at) {
			startAt = selector.start_at;
			delete selector.start_at;
		}
		if (selector.end_at) {
			endAt = selector.end_at;
			delete selector.end_at;
		}

		// Define the query with explicit typing
		const query = {
			...buildQuery(selector, config),
			relations: ['variant', 'variant.product', 'warehouse', 'user'],
			order: {
				created_at: 'DESC',
			},
		} as FindManyOptions<InventoryTransaction>;

		// Handle dynamic search if q exists
		if (q) {
			const where =
				query.where as FindOptionsWhere<FilterableInventoryTransactionProps>;

			delete where.q;
			delete where.warehouse;
			delete where.quantity;
			delete where.note;

			query.where = [
				{ ...where, note: ILike(`%${q}%`) },
				{ ...where, variant: { sku: ILike(`%${q}%`) } },
				{ ...where, variant: { product: { title: ILike(`%${q}%`) } } },
				{ ...where, warehouse: { location: ILike(`%${q}%`) } },
			];
		}

		if (type) {
			query.where = [{ ...query.where, type: type as TransactionType }];
		}

		if (startAt && endAt) {
			query.where = [{ ...query.where, created_at: Between(startAt, endAt) }];
		}

		return await inventoryTransactionRepo.findAndCount(query);
	}

	async retrieve(id: string) {
		const inventoryTransactionRepo = this.activeManager_.withRepository(
			this.inventoryTransactionRepository_
		);

		const inventoryTransaction = await inventoryTransactionRepo.findOne({
			where: { id },
		});

		if (!inventoryTransaction) {
			throw new Error(`Inventory transaction with ID ${id} not found`);
		}

		return inventoryTransaction;
	}

	// Add
	async addInventoryToWarehouse(data: ManageInventoryTransaction) {
		return await this.atomicPhase_(async (manager: EntityManager) => {
			const inventoryTransactionRepo = manager.withRepository(
				this.inventoryTransactionRepository_
			);

			const warehouseInventoryServiceTx =
				this.warehouseInventoryService_.withTransaction(manager);

			const itemUnitServiceTx = this.itemUnitService_.withTransaction(manager);

			// retrieve quantity of the item unit
			// to calculate the inventory quantity
			const retrievedUnit = await itemUnitServiceTx.retrieve(data.unit_id);
			const inventoryQuantity = data.quantity * retrievedUnit.quantity;

			// retrieve warehouse inventory
			const warehouseInventory = await warehouseInventoryServiceTx.retrieve(
				data.warehouse_inventory_id
			);

			if (warehouseInventory.item_unit) {
				if (warehouseInventory.item_unit.id !== data.unit_id) {
					await warehouseInventoryServiceTx.createUnitWithVariant({
						warehouse_id: warehouseInventory.warehouse_id,
						unit_id: data.unit_id,
						variant_id: data.variant_id,
						quantity: inventoryQuantity,
					});
				} else {
					await warehouseInventoryServiceTx.update(warehouseInventory.id, {
						quantity: warehouseInventory.quantity + inventoryQuantity,
					});
				}
			}

			const note =
				data?.note ||
				`Đã nhập kho ${data.quantity} ${retrievedUnit.unit} (${inventoryQuantity} đôi) vào vị trí ${warehouseInventory.warehouse.location}`;

			// create a new inventory transaction
			const inventoryTransaction = inventoryTransactionRepo.create({
				variant_id: data.variant_id,
				warehouse_id: data.warehouse_id,
				quantity: inventoryQuantity,
				type: data.type as TransactionType,
				note,
				user_id: data.user_id,
			});

			await inventoryTransactionRepo.save(inventoryTransaction);

			return inventoryTransaction;
		});
	}

	// Remove
	async removeInventoryToWarehouse(data: ManageInventoryTransaction) {
		return await this.atomicPhase_(async (manager: EntityManager) => {
			const inventoryTransactionRepo = manager.withRepository(
				this.inventoryTransactionRepository_
			);

			const warehouseInventoryServiceTx =
				this.warehouseInventoryService_.withTransaction(manager);

			const itemUnitServiceTx = this.itemUnitService_.withTransaction(manager);

			// retrieve quantity of the item unit
			// to calculate the inventory quantity
			const retrievedUnit = await itemUnitServiceTx.retrieve(data.unit_id);
			const inventoryQuantity = data.quantity * retrievedUnit.quantity;

			// retrieve warehouse inventory
			const warehouseInventory = await warehouseInventoryServiceTx.retrieve(
				data.warehouse_inventory_id
			);

			if (warehouseInventory.quantity - inventoryQuantity > 0) {
				await warehouseInventoryServiceTx.update(warehouseInventory.id, {
					quantity: warehouseInventory.quantity - inventoryQuantity,
				});
			} else {
				await warehouseInventoryServiceTx.delete(warehouseInventory.id);
			}

			const note =
				data?.note ||
				`Đã xuất kho ${data.quantity} ${retrievedUnit.unit} (${inventoryQuantity} đôi) tại vị trí ${warehouseInventory.warehouse.location}`;

			// create a new inventory transaction
			const inventoryTransaction = inventoryTransactionRepo.create({
				variant_id: data.variant_id,
				warehouse_id: data.warehouse_id,
				quantity: inventoryQuantity,
				type: data.type as TransactionType,
				note,
				user_id: data.user_id,
			});

			await inventoryTransactionRepo.save(inventoryTransaction);

			return inventoryTransaction;
		});
	}
}

export default InventoryTransactionService;
