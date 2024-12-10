import {
	// alias the core entity to not cause a naming conflict
	ProductVariant as MedusaProductVariant,
} from '@medusajs/medusa';
import { Column, Entity } from 'typeorm';

@Entity()
export class ProductVariant extends MedusaProductVariant {
	@Column()
	supplier_price: number;

	@Column()
	allowed_quantities: number;
}
