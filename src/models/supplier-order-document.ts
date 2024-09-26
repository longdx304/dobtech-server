import { BaseEntity, generateEntityId } from '@medusajs/medusa';
import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { SupplierOrder } from './supplier-order';

@Entity()
export class SupplierOrderDocument extends BaseEntity {
	@Column()
	supplier_order_id: string;

	@ManyToOne(() => SupplierOrder, (so) => so.documents)
	@JoinColumn({ name: 'supplier_order_id' })
	supplier_order: SupplierOrder;

	@Column()
	document_url: string;

	@Column({ type: 'jsonb', nullable: true, default: {} })
	metadata: Record<string, unknown>;

	@BeforeInsert()
	private beforeInsert(): void {
		this.id = generateEntityId(this.id, 'sod');
	}
}
