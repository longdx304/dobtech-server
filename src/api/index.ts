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

registerOverriddenValidators(AdminCreateUserRequest);
registerOverriddenValidators(AdminUpdateUserRequest);

registerExtendedValidator(StorePostCartsCartReq);
registerExtendedValidator(StorePostCartReq);

// Register extended validators for product variants
registerExtendedValidator(AdminPostProductsReq);
registerExtendedValidator(AdminPostProductsProductVariantsReq);
registerExtendedValidator(AdminPostProductsProductVariantsVariantReq);
