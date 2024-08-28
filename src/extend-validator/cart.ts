import { StorePostCartReq as MedusaStorePostCartReq } from '@medusajs/medusa/dist/api/routes/store/carts/create-cart';
import { StorePostCartsCartReq as MedusaStorePostCartsCartReq } from '@medusajs/medusa/dist/api/routes/store/carts/update-cart';

import { IsOptional } from 'class-validator';

class StorePostCartsCartReq extends MedusaStorePostCartsCartReq {
  @IsOptional()
  metadata?: Record<string, unknown>;
}

class StorePostCartReq extends MedusaStorePostCartReq {
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export { StorePostCartReq, StorePostCartsCartReq };
