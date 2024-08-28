// src/strategies/product-import.ts

import MedusaProductImportStrategy from '@medusajs/medusa/dist/strategies/batch-jobs/product/import';

export default class ProductImportStrategy extends MedusaProductImportStrategy {
  constructor() {
    // @ts-ignore
    super(...arguments);

    Object.assign(this.csvParser_);
  }

}
