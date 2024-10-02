import { Column, Entity } from 'typeorm';
import {
	// alias the core entity to not cause a naming conflict
	ProductVariant as MedusaProductVariant,
} from '@medusajs/medusa';

@Entity()
export class ProductVariant extends MedusaProductVariant {
	@Column()
	supplier_price: number;

	@Column()
	allowed_quantities: number;
}
