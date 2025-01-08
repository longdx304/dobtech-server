import { DateComparisonOperator } from '@medusajs/medusa';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Fulfillment } from 'src/models/fulfillment';

export type UpdateFulfillment = Partial<Fulfillment> & {};

export class AdminListFulfillmentsSelector {

	@IsString()
	@IsOptional()
	q?: string;

	@IsString()
	@IsOptional()
	id?: string;

	@IsString()
	@IsOptional()
	order_id?: string;

	@IsString()
	@IsOptional()
	checker_id?: string;

	@IsString()
	@IsOptional()
	checker_url?: string;

	@IsString()
	@IsOptional()
	status?: string;

	@IsString()
	@IsOptional()
	shipped_id?: string;

	@IsOptional()
	@ValidateNested()
	@Type(() => DateComparisonOperator)
	canceled_at?: DateComparisonOperator;

	@IsOptional()
	@ValidateNested()
	@Type(() => DateComparisonOperator)
	shipped_at?: DateComparisonOperator;

	@IsString()
	@IsOptional()
	shipped_url?: string;

	@IsOptional()
	@ValidateNested()
	@Type(() => DateComparisonOperator)
	checked_at?: DateComparisonOperator;

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

export enum FulfullmentStatus {
	AWAITING = 'awaiting',
	DELIVERING = 'delivering',
	SHIPPED = 'shipped',
	CANCELED = 'canceled',
}
