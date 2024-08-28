// src/strategies/product-export.ts

import MedusaProductExportStrategy from '@medusajs/medusa/dist/strategies/batch-jobs/product/export';
import { productColumnsDefinition } from './__types__/product-columns-definition';

export default class ProductExportStrategy extends MedusaProductExportStrategy {
  constructor() {
    // @ts-ignore
    super(...arguments);

    Object.assign(this.columnsDefinition, productColumnsDefinition);
  }
}
