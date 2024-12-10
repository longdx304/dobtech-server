import { TransactionBaseService } from '@medusajs/medusa';
import { EntityManager } from 'typeorm';
import ItemUnitRepository from '../repositories/item-unit';
import { ItemUnit } from '../models/item-unit';
import { CreateItemUnit, UpdateItemUnit } from '../types/item-unit';

type InjectedDependencies = {
	manager: EntityManager;
	itemUnitRepository: typeof ItemUnitRepository;
};

class ItemUnitService extends TransactionBaseService {
	protected itemUnitRepository_: typeof ItemUnitRepository;

	constructor({ itemUnitRepository }: InjectedDependencies) {
		super(arguments[0]);
		this.itemUnitRepository_ = itemUnitRepository;
	}

	async retrieve(id: string): Promise<ItemUnit | undefined> {
		return await this.itemUnitRepository_.findOne({ where: { id } });
	}

	async list(sortBy: keyof ItemUnit = 'quantity', order?: 'ASC' | 'DESC'): Promise<ItemUnit[]> {
		const itemUnitRepo = this.activeManager_.withRepository(
			this.itemUnitRepository_
		);

		const [itemUnits] = await itemUnitRepo.findAndCount({
      order: { [sortBy]: order || 'ASC' },
    });

    return itemUnits; 
	}

	async create(data: CreateItemUnit): Promise<ItemUnit> {
    return await this.atomicPhase_(
      async (transactionManager: EntityManager) => {
        const itemUnitRepo = transactionManager.withRepository(this.itemUnitRepository_);

        // Check if a item unit with the same quantity already exists
        const existingItemUnit = await itemUnitRepo.findOne({
          where: { quantity: data.quantity },
        });

        if (existingItemUnit) {
          throw new Error('Đơn vị hàng đã tồn tại');
        }

        const itemUnit = itemUnitRepo.create(data);
        return await itemUnitRepo.save(itemUnit);
      }
    )
	}

  async update(id: string, data: UpdateItemUnit): Promise<ItemUnit> {
    return await this.atomicPhase_(
      async (transactionManager: EntityManager) => {
        const itemUnitRepo = transactionManager.withRepository(this.itemUnitRepository_);

        const itemUnit = await itemUnitRepo.findOne({ where: { id } });

        if (!itemUnit) {
          throw new Error('Không tìm thấy đơn vị hàng này');
        }

        Object.assign(itemUnit, data);
        return await itemUnitRepo.save(itemUnit);
      }
    )
  }

	async delete(id: string): Promise<void> {
		await this.itemUnitRepository_.delete({ id });
	}
}

export default ItemUnitService;
