import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import {
	// alias the core entity to not cause a naming conflict
	Payment as MedusaPayment,
} from '@medusajs/medusa';
import { SupplierOrder } from './supplier-order';

@Entity()
export class Payment extends MedusaPayment {
	@Index()
	@Column({ nullable: true })
	supplier_order_id: string | null;

	@ManyToOne(() => SupplierOrder, (supplier_order) => supplier_order.payments)
	@JoinColumn({ name: 'supplier_order_id' })
	supplier_order: SupplierOrder;
}
