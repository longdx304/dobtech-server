import { DateComparisonOperator, IsType } from '@medusajs/medusa';
import { Transform, Type } from 'class-transformer';
import {
	IsArray,
	IsEnum,
	IsOptional,
	IsString,
	ValidateNested,
} from 'class-validator';
import {
	FulfillSupplierOrderStt,
	OrderStatus,
	PaymentStatus,
	SupplierOrder,
} from '../models/supplier-order';

export type UpdateSupplierOrder = Partial<SupplierOrder> & {};

export type LineItem = {
	variantId: string;
	quantity: number;
	unit_price?: number;
};

export type CreateSupplierOrderInput = {
	isSendEmail?: boolean;
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

/**
 * Filters to apply on the retrieved orders.
 */
export class AdminListSupplierOrdersSelector {
	/**
	 * Search term to search orders' shipping address, first name, email, and display ID.
	 */
	@IsString()
	@IsOptional()
	q?: string;

	/**
	 * ID to filter orders by.
	 */
	@IsString()
	@IsOptional()
	id?: string;

	/**
	 * Statuses to filter orders by.
	 */
	@IsArray()
	@IsEnum(OrderStatus, { each: true })
	@IsOptional()
	@Transform(({ value }) => {
		if (typeof value === 'string') {
			return value.split(',').map((v) => v.trim());
		}
		return value;
	})
	status?: string[];

	/**
	 * Fulfillment statuses to filter orders by.
	 */
	@IsArray()
	@IsEnum(FulfillSupplierOrderStt, { each: true })
	@IsOptional()
	@Transform(({ value }) => {
		if (typeof value === 'string') {
			return value.split(',').map((v) => v.trim());
		}
		return value;
	})
	fulfillment_status?: string[];

	/**
	 * Payment statuses to filter orders by.
	 */
	@IsArray()
	@IsEnum(PaymentStatus, { each: true })
	@IsOptional()
	payment_status?: string[];

	/**
	 * Display ID to filter orders by.
	 */
	@IsString()
	@IsOptional()
	display_id?: string;

	/**
	 * Cart ID to filter orders by.
	 */
	@IsString()
	@IsOptional()
	cart_id?: string;

	/**
	 * Customer ID to filter orders by.
	 */
	@IsString()
	@IsOptional()
	customer_id?: string;

	/**
	 * Email to filter orders by.
	 */
	@IsString()
	@IsOptional()
	email?: string;

	/**
	 * Regions to filter orders by.
	 */
	@IsOptional()
	@IsType([String, [String]])
	region_id?: string | string[];

	/**
	 * Currency code to filter orders by.
	 */
	@IsString()
	@IsOptional()
	currency_code?: string;

	/**
	 * Tax rate to filter orders by.
	 */
	@IsString()
	@IsOptional()
	tax_rate?: string;

	/**
	 * Sales channel IDs to filter orders by.
	 */
	@IsArray()
	@IsOptional()
	sales_channel_id?: string[];

	/**
	 * Date filters to apply on the orders' `canceled_at` date.
	 */
	@IsOptional()
	@ValidateNested()
	@Type(() => DateComparisonOperator)
	canceled_at?: DateComparisonOperator;

	/**
	 * Date filters to apply on the orders' `created_at` date.
	 */
	@IsOptional()
	@ValidateNested()
	@Type(() => DateComparisonOperator)
	created_at?: DateComparisonOperator;

	/**
	 * Date filters to apply on the orders' `updated_at` date.
	 */
	@IsOptional()
	@ValidateNested()
	@Type(() => DateComparisonOperator)
	updated_at?: DateComparisonOperator;
}
