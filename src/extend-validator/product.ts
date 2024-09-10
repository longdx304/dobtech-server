import { AdminPostProductsProductVariantsReq as MedusaAdminPostProductsProductVariantsReq } from '@medusajs/medusa/dist/api/routes/admin/products/create-variant';
import { AdminPostProductsProductVariantsVariantReq as MedusaAdminPostProductsProductVariantsVariantReq } from '@medusajs/medusa/dist/api/routes/admin/products/update-variant';
import { IsNumber, IsOptional } from 'class-validator';

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

export {
	AdminPostProductsProductVariantsReq,
	AdminPostProductsProductVariantsVariantReq,
};
