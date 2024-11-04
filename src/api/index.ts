import { registerOverriddenValidators } from '@medusajs/medusa';
import {
	StorePostCartReq,
	StorePostCartsCartReq,
} from '../extend-validator/cart';
import {
	AdminCreateUserRequest,
	AdminUpdateUserRequest,
} from '../extend-validator/user';
import { registerExtendedValidator } from '../utils/register-exntended-validator';
import {
	AdminPostProductsProductVariantsReq,
	AdminPostProductsProductVariantsVariantReq,
	AdminPostProductsReq,
} from '../extend-validator/product';
import { AdminPostPriceListsPriceListPriceListReq, AdminPostPriceListsPriceListReq } from '../extend-validator/price-list';
import { AdminPostOrderEditsEditLineItemsLineItemReq } from '../extend-validator/order-edit';

registerOverriddenValidators(AdminCreateUserRequest);
registerOverriddenValidators(AdminUpdateUserRequest);

registerExtendedValidator(StorePostCartsCartReq);
registerExtendedValidator(StorePostCartReq);

// Register extended validators for product variants
registerExtendedValidator(AdminPostProductsReq);
registerExtendedValidator(AdminPostProductsProductVariantsReq);
registerExtendedValidator(AdminPostProductsProductVariantsVariantReq);


registerExtendedValidator(AdminPostPriceListsPriceListReq);
registerExtendedValidator(AdminPostPriceListsPriceListPriceListReq);

registerExtendedValidator(AdminPostOrderEditsEditLineItemsLineItemReq);
