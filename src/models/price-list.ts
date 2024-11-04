import { Column, Entity, Index, JoinColumn, OneToOne } from "typeorm";
import {
	Customer,
	// alias the core entity to not cause a naming conflict
	PriceList as MedusaPriceList,
} from "@medusajs/medusa";

@Entity()
export class PriceList extends MedusaPriceList {
	@Index()
	@Column({ nullable: true })
	customer_id: string;

	@OneToOne(() => Customer)
	@JoinColumn({ name: 'customer_id' })
	customer: Customer;
}
