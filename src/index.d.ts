export declare module '@medusajs/medusa/dist/models/user' {
	declare interface User {
		phone: string;
		permissions: string;
	}
}

export declare module '@medusajs/medusa/dist/models/product-variant' {
	declare interface ProductVariant {
		supplier_price: number | null;
		allowed_quantities: number | null;
	}
}

import { ProductVariant } from '@medusajs/medusa/dist/models/product-variant';
export declare module '@medusajs/medusa/dist/models/product' {
	declare interface Product {
		variants: Relation<ProductVariant>[];
	}
}
