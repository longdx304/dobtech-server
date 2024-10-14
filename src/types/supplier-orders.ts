enum SupplierOrderStatus {
	pending = 'pending',
	completed = 'completed',
	archived = 'archived',
	canceled = 'canceled',
	requires_action = 'requires_action',
}

enum FulfillmentStatus {
	not_fulfilled = 'not_fulfilled',
	fulfilled = 'fulfilled',
	partially_fulfilled = 'partially_fulfilled',
	shipped = 'shipped',
	partially_shipped = 'partially_shipped',
	canceled = 'canceled',
	returned = 'returned',
	partially_returned = 'partially_returned',
	requires_action = 'requires_action',
}

enum PaymentStatus {
	captured = 'captured',
	awaiting = 'awaiting',
	not_paid = 'not_paid',
	refunded = 'refunded',
	partially_refunded = 'partially_refunded',
	canceled = 'canceled',
	requires_action = 'requires_action',
}

export type LineItem = {
	variantId: string;
	quantity: number;
	unit_price?: number;
};

export type CreateSupplierOrderInput = {
	lineItems: LineItem[];
	supplierId: string;
	userId: string;
	email: string;
	countryCode: string;
	region_id: string;
	currency_code: string;
	estimated_production_time: Date;
	settlement_time: Date;
	document_url: string;
	metadata?: Record<string, unknown>;
};

export type UpdateSupplierOrderInput = {
	cartId?: string;
	lineItems: LineItem[];
	metadata?: Record<string, unknown>;
};

export const defaultAdminSupplierOrdersRelations = [
	'suppliers',
	'users',
	'line_items',
];

export const defaultAdminSupplierOrdersFields = [
	'id',
	'status',
	'created_at',
	'updated_at',
	'metadata',
	'supplier_id',
	'user_id',
];

export type SupplierOrderSelector = {
	q?: string;
};

export interface DeleteLineItemRequest {
	lineItemId: string;
}
