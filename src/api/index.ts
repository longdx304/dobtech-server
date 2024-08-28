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

registerOverriddenValidators(AdminCreateUserRequest);
registerOverriddenValidators(AdminUpdateUserRequest);

registerExtendedValidator(StorePostCartsCartReq);
registerExtendedValidator(StorePostCartReq);
