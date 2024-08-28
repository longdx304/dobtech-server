import { AdminCreateUserRequest as MedusaAdminCreateUserRequest } from "@medusajs/medusa/dist/api/routes/admin/users/create-user";
import { AdminUpdateUserRequest as MedusaAdminUpdateUserRequest } from "@medusajs/medusa/dist/api/routes/admin/users/update-user";
import { IsString } from "class-validator";

class AdminCreateUserRequest extends MedusaAdminCreateUserRequest {
	@IsString()
	phone?: string;

	@IsString()
	permissions?: string;
}

class AdminUpdateUserRequest extends MedusaAdminUpdateUserRequest {
	@IsString()
	phone?: string;

	@IsString()
	permissions?: string;
}

export { AdminCreateUserRequest, AdminUpdateUserRequest };
