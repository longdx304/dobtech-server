import { ProductVariant } from '@medusajs/medusa/dist/models/product-variant';
export declare module '@medusajs/medusa/dist/models/user' {
	declare interface User {
		phone: string;
		permissions: string;
	}
}

export declare module '@medusajs/medusa/dist/models/order' {
	declare interface Order {
		handler_id: string | null;
		handler: Relation<User>;
	}
}

export declare module '@medusajs/medusa/dist/models/product-variant' {
	declare interface ProductVariant {
		supplier_price: number | null;
		allowed_quantities: number | null;
		cogs_price: number | null;
	}
}

export declare module '@medusajs/medusa/dist/models/product' {
	declare interface Product {
		variants: Relation<ProductVariant>[];
	}
}

export declare module '@medusajs/medusa/dist/models/line-item' {
	declare interface LineItem {
		supplier_order_id: string;
		supplier_order: SupplierOrder;
		warehouse_quantity?: number | null;
	}
}

export declare module '@medusajs/medusa/dist/models/order-edit' {
	declare interface OrderEdit {
		supplier_order_id: string;
		supplier_order: SupplierOrder;
	}
}

export declare module '@medusajs/medusa/dist/models/payment' {
	declare interface Payment {
		supplier_order_id: string;
		supplier_order: SupplierOrder;
	}
}

export declare module '@medusajs/medusa/dist/models/refund' {
	declare interface Refund {
		supplier_order_id: string;
		supplier_order: SupplierOrder;
	}
}

export declare module '@medusajs/medusa/dist/models/price-list' {
	declare interface PriceList {
		customer_id: string | null;
		customer: Customer;
	}
}
