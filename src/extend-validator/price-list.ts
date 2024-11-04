import { AdminPostPriceListsPriceListReq as MedusaAdminPostPriceListsPriceListReq } from '@medusajs/medusa/dist/api/routes/admin/price-lists/create-price-list';
import { AdminPostPriceListsPriceListPriceListReq as MedusaAdminPostPriceListsPriceListPriceListReq } from '@medusajs/medusa/dist/api/routes/admin/price-lists/update-price-list';
import { IsOptional, IsString } from 'class-validator';

class AdminPostPriceListsPriceListReq extends MedusaAdminPostPriceListsPriceListReq {
	@IsOptional()
	@IsString()
	customer_id?: string;
}

class AdminPostPriceListsPriceListPriceListReq extends MedusaAdminPostPriceListsPriceListPriceListReq {
	@IsOptional()
	@IsString()
	customer_id?: string;
}

export {
	AdminPostPriceListsPriceListReq,
	AdminPostPriceListsPriceListPriceListReq,
};
