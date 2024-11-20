import {
	LineItemService,
	ProductVariantService,
	TransactionBaseService,
} from '@medusajs/medusa';
import { InventoryTransaction } from 'src/models/inventory-transaction';
import InventoryTransactionRepository from 'src/repositories/inventory-transaction';
import WarehouseInventoryRepository from 'src/repositories/warehouse-inventory';
import { EntityManager } from 'typeorm';
import WarehouseService from './warehouse';
import WarehouseInventoryService from './warehouse-inventory';
import { CreateInventoryTransaction } from 'src/types/inventory-transaction';
import ItemUnitService from './item-unit';

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

			const {
				unit_id,
				quantity,
				variant_id,
				warehouse_id,
				supplier_order_id,
				type,
				note,
				user_id,
			} = data;

			// create a new inventory transaction
			const inventoryTransaction = inventoryTransactionRepo.create({
				variant_id,
				warehouse_id,
				supplier_order_id,
				quantity,
				type,
				note,
				user_id,
			});

			return await inventoryTransactionRepo.save(inventoryTransaction);
		});
	}

	async listAndCount(
		filter: Partial<InventoryTransaction>,
		options = { skip: 0, take: 10 }
	) {
		const inventoryTransactionRepo = this.activeManager_.withRepository(
			this.inventoryTransactionRepository_
		);

		const [transactions, count] = await inventoryTransactionRepo.findAndCount({
			where: filter,
			skip: options.skip,
			take: options.take,
		});

		return [transactions, count];
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
}

export default InventoryTransactionService;
