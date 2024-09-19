import { AdminPostProductsProductVariantsReq as MedusaAdminPostProductsProductVariantsReq } from '@medusajs/medusa/dist/api/routes/admin/products/create-variant';
import { AdminPostProductsProductVariantsVariantReq as MedusaAdminPostProductsProductVariantsVariantReq } from '@medusajs/medusa/dist/api/routes/admin/products/update-variant';
import { AdminPostProductsReq as MedusaAdminPostProductsReq } from '@medusajs/medusa/dist/api/routes/admin/products/create-product';
import {
	IsNumber,
	IsOptional,
	ValidateNested,
	IsArray,
	IsString,
	IsBoolean,
	IsObject
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductVariantPricesCreateReq } from '@medusajs/medusa/dist/types/product-variant';
class AdminPostProductsProductVariantsReq extends MedusaAdminPostProductsProductVariantsReq {
	@IsOptional()
	@IsNumber()
	supplier_price?: number;
}

class AdminPostProductsProductVariantsVariantReq extends MedusaAdminPostProductsProductVariantsVariantReq {
	@IsOptional()
	@IsNumber()
	supplier_price?: number;
}

class ProductVariantOptionReq {
	@IsString()
	value: string;
}

class ProductVariantReq {
	@IsString()
	title: string;

	@IsString()
	@IsOptional()
	sku?: string;

	@IsString()
	@IsOptional()
	ean?: string;

	@IsString()
	@IsOptional()
	upc?: string;

	@IsString()
	@IsOptional()
	barcode?: string;

	@IsString()
	@IsOptional()
	hs_code?: string;

	@IsNumber()
	@IsOptional()
	inventory_quantity?: number = 0;

	@IsBoolean()
	@IsOptional()
	allow_backorder?: boolean;

	@IsBoolean()
	@IsOptional()
	manage_inventory?: boolean;

	@IsNumber()
	@IsOptional()
	weight?: number;

	@IsNumber()
	@IsOptional()
	length?: number;

	@IsNumber()
	@IsOptional()
	height?: number;

	@IsNumber()
	@IsOptional()
	width?: number;

	@IsString()
	@IsOptional()
	origin_country?: string;

	@IsString()
	@IsOptional()
	mid_code?: string;

	@IsString()
	@IsOptional()
	material?: string;

	@IsOptional()
	@IsNumber()
	supplier_price?: number;

	@IsObject()
	@IsOptional()
	metadata?: Record<string, unknown>;

	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => ProductVariantPricesCreateReq)
	prices: ProductVariantPricesCreateReq[];

	@IsOptional()
	@Type(() => ProductVariantOptionReq)
	@ValidateNested({ each: true })
	@IsArray()
	options?: ProductVariantOptionReq[] = [];
}

class AdminPostProductsReq extends MedusaAdminPostProductsReq {
	@ValidateNested({ each: true })
	@IsOptional()
	@Type(() => ProductVariantReq)
	@IsArray()
	variants?: ProductVariantReq[];
}

export {
	AdminPostProductsProductVariantsReq,
	AdminPostProductsProductVariantsVariantReq,
	AdminPostProductsReq,
};
