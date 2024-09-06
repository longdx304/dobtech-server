import { IdMap, MockManager, MockRepository } from 'medusa-test-utils';
import SupplierService from '../supplier';

const supplierRepository = MockRepository({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  findAndCount: jest.fn(),
});

describe('SupplierService', () => {
  const supplierService = new SupplierService({
    manager: MockManager,
    supplierRepository,
  } as any);

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe('retrieve', () => {
    it('successfully retrieves a supplier', async () => {
      const supplier = {
        id: IdMap.getId('supplier1'),
        supplier_name: 'Test Supplier',
      };
      supplierRepository.findOne.mockImplementation(() =>
        Promise.resolve(supplier)
      );

      const result = await supplierService.retrieve(IdMap.getId('supplier1'));

      expect(supplierRepository.findOne).toHaveBeenCalledTimes(1);
      expect(supplierRepository.findOne).toHaveBeenCalledWith({
        where: { id: IdMap.getId('supplier1') },
      });
      expect(result).toEqual(supplier);
    });
  });

  describe('list', () => {
    it('successfully lists suppliers with pagination', async () => {
      const suppliers = [
        { id: IdMap.getId('supplier1'), supplier_name: 'Supplier 1' },
        { id: IdMap.getId('supplier2'), supplier_name: 'Supplier 2' },
      ];
      supplierRepository.findAndCount.mockImplementation(() =>
        Promise.resolve([suppliers, 2])
      );

      const result = await supplierService.list(10, 0);

      expect(supplierRepository.findAndCount).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        order: { created_at: 'ASC' },
      });
      expect(result).toEqual({
        suppliers,
        count: 2,
        limit: 10,
        offset: 0,
      });
    });
  });

  describe('delete', () => {
    it('successfully deletes a supplier', async () => {
      await supplierService.delete(IdMap.getId('supplier1'));

      expect(supplierRepository.delete).toHaveBeenCalledWith(
        IdMap.getId('supplier1')
      );
    });
  });

  describe('create', () => {
    const supplierRepository = {
      ...MockRepository({
        findOne: (query) => {
          if (query.where.email === 'existing@supplier.com') {
            return Promise.resolve({
              id: IdMap.getId('exists'),
              supplier_name: 'Existing Supplier',
              email: 'existing@supplier.com',
            });
          }
          return undefined;
        },
      }),
      findAndCount: jest.fn().mockImplementation((query) => {
        if (query.where.email === 'existing@supplier.com') {
          return Promise.resolve([
            [
              {
                id: IdMap.getId('exists'),
                supplier_name: 'Existing Supplier',
                email: 'existing@supplier.com',
              },
            ],
            1,
          ]);
        }
        return Promise.resolve([[], 0]);
      }),
    };

    const supplierService = new SupplierService({
      manager: MockManager,
      supplierRepository,
    } as any);

    beforeEach(async () => {
      jest.clearAllMocks();
    });

    it('successfully creates a supplier', async () => {
      await supplierService.create({
        supplier_name: 'New Supplier',
        email: 'new@supplier.com',
        phone: '1234567890',
        address: '123 Main St',
        default_estimated_production_time: 10,
        default_settlement_time: 10,
      });

      expect(supplierRepository.create).toHaveBeenCalledTimes(1);
      expect(supplierRepository.create).toHaveBeenCalledWith({
        supplier_name: 'New Supplier',
        email: 'new@supplier.com',
        phone: '1234567890',
        address: '123 Main St',
        default_estimated_production_time: 10,
        default_settlement_time: 10,
      });
    });

    it('calls findAndCount with email', async () => {
      await supplierService.create({
        supplier_name: 'New Supplier',
        email: 'new@supplier.com',
        phone: '1234567890',
        address: '123 Main St',
        default_estimated_production_time: 10,
        default_settlement_time: 10,
      });

      expect(supplierRepository.findOne).toHaveBeenCalledWith({
        where: {
          email: 'new@supplier.com',
        },
      });
    });

    it('fails to create a supplier with an existing email', async () => {
      await expect(
        supplierService.create({
          supplier_name: 'Duplicate Supplier',
          email: 'existing@supplier.com',
          phone: '9876543210',
          address: '456 Elm St',
          default_estimated_production_time: 5,
          default_settlement_time: 10,
        })
      ).rejects.toThrow('A supplier with this email already exists');
    });
  });

  describe('update', () => {
    const supplierRepository = MockRepository({
      findOne: (query) => {
        return Promise.resolve({
          id: IdMap.getId('supplier1'),
        });
      },
    });

    const supplierService = new SupplierService({
      manager: MockManager,
      supplierRepository,
    } as any);

    beforeEach(async () => {
      jest.clearAllMocks();
    });

    it('successfully updates a supplier', async () => {
      await supplierService.update(IdMap.getId('supplier1'), {
        supplier_name: 'Updated Supplier',
        address: '123 Main St',
      });

      expect(supplierRepository.save).toHaveBeenCalledTimes(1);
      expect(supplierRepository.save).toHaveBeenCalledWith({
        id: IdMap.getId('supplier1'),
        supplier_name: 'Updated Supplier',
        address: '123 Main St',
      });
    });

    it('successfully updates supplier metadata', async () => {
      await supplierService.update(IdMap.getId('supplier1'), {
        metadata: {
          foo: 'bar',
        },
      });

      expect(supplierRepository.save).toHaveBeenCalledTimes(1);
      expect(supplierRepository.save).toHaveBeenCalledWith({
        id: IdMap.getId('supplier1'),
        metadata: {
          foo: 'bar',
        },
      });
    });
  });
});
