export type CreateSupplierInput = {
  email: string;
  supplier_name: string;
  phone?: string;
  address?: string;
  estimated_production_time: number;
  settlement_time: number;
  metadata?: Record<string, unknown>;
};

export type UpdateSupplierInput = Partial<CreateSupplierInput>;
