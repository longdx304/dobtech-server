// src/strategies/__types__/product-columns-definition.ts

import { Product } from '@medusajs/medusa';
import { ProductColumnDefinition } from '@medusajs/medusa/dist/strategies/batch-jobs/product/types';
import { productColumnsDefinition as medusaProductColumnsDefinition } from '@medusajs/medusa/dist/strategies/batch-jobs/product/types/columns-definition';

export const productColumnsDefinition: ProductColumnDefinition = {
  'Product Metadata': {
    name: 'Product Metadata',
    importDescriptor: {
      mapTo: 'product.metadata',
    },
    exportDescriptor: {
      // For actual metadata:
      accessor: (product: Product) =>
        JSON.stringify(product.metadata) ?? 'TEST',
      entityName: 'product',
    },
  },
  ...medusaProductColumnsDefinition,
};
