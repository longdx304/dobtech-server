import { ProductVariant } from '@medusajs/medusa/dist/models/product-variant';
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

export declare module '@medusajs/medusa/dist/models/product' {
	declare interface Product {
		variants: Relation<ProductVariant>[];
	}
}

export declare module '@medusajs/medusa/dist/models/order-edit' {
	declare interface OrderEdit {
		supplier_order_id: string;
	}
}
