import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import {
	// alias the core entity to not cause a naming conflict
	OrderEdit as MedusaOrderEdit,
} from '@medusajs/medusa';
import { SupplierOrder } from './supplier-order';

@Entity()
export class OrderEdit extends MedusaOrderEdit {
	@Index()
	@Column({ nullable: true })
	order_id: string;

	@Index()
	@Column({ nullable: true })
	supplier_order_id: string;

	@ManyToOne(() => SupplierOrder, (so) => so.edits)
	@JoinColumn({ name: 'supplier_order_id' })
	supplier_order: SupplierOrder;
}
