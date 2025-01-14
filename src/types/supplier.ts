import { Supplier } from 'src/models/supplier';

export type CreateSupplierInput = Supplier & {}

export type UpdateSupplierInput = Partial<CreateSupplierInput>;
