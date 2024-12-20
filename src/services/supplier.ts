import { TransactionBaseService } from '@medusajs/medusa';
import { CreateSupplierInput, UpdateSupplierInput } from 'src/types/supplier';
import { EntityManager, Not, IsNull, ILike } from 'typeorm';
import { Supplier } from '../models/supplier';
import SupplierRepository from '../repositories/supplier';

type InjectedDependencies = {
  manager: EntityManager;
  supplierRepository: typeof SupplierRepository;
};

class SupplierService extends TransactionBaseService {
  protected supplierRepository_: typeof SupplierRepository;

  constructor({ supplierRepository }: InjectedDependencies) {
    super(arguments[0]);

    this.supplierRepository_ = supplierRepository;
  }

  async retrieve(id: string): Promise<Supplier | undefined> {
    const supplierRepo = this.activeManager_.withRepository(
      this.supplierRepository_
    );

    const supplier = await supplierRepo.findOne({
      where: { id },
    });

    return supplier;
  }

  async update(id: string, data: UpdateSupplierInput): Promise<Supplier> {
    return await this.atomicPhase_(
      async (transactionManager: EntityManager) => {
        const supplierRepository = transactionManager.withRepository(
          this.supplierRepository_
        );
        const supplier = await supplierRepository.findOne({ where: { id } });
        if (!supplier) {
          throw new Error('Supplier not found');
        }
        Object.assign(supplier, data);
        return await supplierRepository.save(supplier);
      }
    );
  }

  async list(
    q?: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{
    suppliers: Supplier[];
    count: number;
    limit: number;
    offset: number;
  }> {
    const supplierRepo = this.activeManager_.withRepository(
      this.supplierRepository_
    );

    const whereClause = q
      ? [
          { supplier_name: ILike(`%${q}%`) }, // Search by name
          { email: ILike(`%${q}%`) }, // Search by email
        ]
      : {};

    const [suppliers, count] = await supplierRepo.findAndCount({
      where: whereClause,
      take: limit,
      skip: offset,
      order: { created_at: 'ASC' },
    });

    return {
      suppliers,
      count,
      limit,
      offset,
    };
  }

  async delete(id: string): Promise<void> {
    const supplierRepo = this.activeManager_.withRepository(
      this.supplierRepository_
    );
    await supplierRepo.delete(id);
  }

  async create(data: CreateSupplierInput): Promise<Supplier> {
    return await this.atomicPhase_(
      async (transactionManager: EntityManager) => {
        const supplierRepository = transactionManager.withRepository(
          this.supplierRepository_
        );

        // Check if a supplier with the same email already exists
        const existingSupplier = await supplierRepository.findOne({
          where: { email: data.email },
        });

        if (existingSupplier) {
          throw new Error('Đã tồn tại NCC với email này! Vui lòng sử dụng email khác');
        }

        // Create a new instance of the Supplier entity
        const newSupplier = supplierRepository.create(data);
        // Object.assign(newSupplier, data);

        // Save the new supplier instance
        return await supplierRepository.save(newSupplier);
      }
    );
  }
}

export default SupplierService;
