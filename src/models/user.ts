import { Column, Entity } from "typeorm";
import {
	// alias the core entity to not cause a naming conflict
	User as MedusaUser,
} from "@medusajs/medusa";

@Entity()
export class User extends MedusaUser {
	@Column()
	phone: string;

	@Column()
	permissions: string;
}
