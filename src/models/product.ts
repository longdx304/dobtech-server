import { Column, Entity, OneToMany } from "typeorm";
import {
	// alias the core entity to not cause a naming conflict
	Product as MedusaProduct,
} from "@medusajs/medusa";
import { ProductVariant } from "./product-variant";

@Entity()
export class Product extends MedusaProduct {
	@OneToMany(() => ProductVariant, (variant) => variant.product, {
    cascade: true,
  })
  variants: ProductVariant[]
}