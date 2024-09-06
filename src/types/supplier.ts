export type CreateSupplierInput = {
  email: string;
  supplier_name: string;
  phone?: string;
  address?: string;
  default_estimated_production_time: number;
  default_settlement_time: number;
  metadata?: Record<string, unknown>;
};

export type UpdateSupplierInput = Partial<CreateSupplierInput>;
