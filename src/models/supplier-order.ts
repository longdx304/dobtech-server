import {
	BaseEntity,
	Cart,
	DbAwareColumn,
	generateEntityId,
	resolveDbGenerationStrategy,
	resolveDbType,
} from '@medusajs/medusa';
import {
	BeforeInsert,
	Column,
	Entity,
	Generated,
	Index,
	JoinColumn,
	OneToMany,
	OneToOne,
} from 'typeorm';
import { Supplier } from './supplier';
import { User } from './user';
import { SupplierOrderDocument } from './supplier-order-document';

export enum OrderStatus {
	PENDING = 'pending',
	COMPLETED = 'completed',
	ARCHIVED = 'archived',
	CANCELED = 'canceled',
	REQUIRES_ACTION = 'requires_action',
}

export enum FulfillmentStatus {
	NOT_FULFILLED = 'not_fulfilled',
	PARTIALLY_FULFILLED = 'partially_fulfilled',
	FULFILLED = 'fulfilled',
	PARTIALLY_SHIPPED = 'partially_shipped',
	SHIPPED = 'shipped',
	PARTIALLY_RETURNED = 'partially_returned',
	RETURNED = 'returned',
	CANCELED = 'canceled',
	REQUIRES_ACTION = 'requires_action',
}

export enum PaymentStatus {
	NOT_PAID = 'not_paid',
	AWAITING = 'awaiting',
	CAPTURED = 'captured',
	PARTIALLY_REFUNDED = 'partially_refunded',
	REFUNDED = 'refunded',
	CANCELED = 'canceled',
	REQUIRES_ACTION = 'requires_action',
}

@Entity()
export class SupplierOrder extends BaseEntity {
	@Column()
	@Generated(resolveDbGenerationStrategy('increment'))
	display_id: number;

	@Column()
	supplier_id: string;

	@OneToOne(() => Supplier)
	// @OneToOne(() => Supplier, { cascade: ['insert', 'remove'] })
	@JoinColumn({ name: 'supplier_id' })
	supplier: Supplier;

	@Index()
	@Column()
	user_id: string;

	@OneToOne(() => User)
	@JoinColumn({ name: 'user_id' })
	user: User;

	@Index()
	@Column()
	cart_id: string;

	@OneToOne(() => Cart)
	@JoinColumn({ name: 'cart_id' })
	cart: Cart;

	@DbAwareColumn({ type: 'enum', enum: OrderStatus, default: 'pending' })
	status: OrderStatus;

	@DbAwareColumn({
		type: 'enum',
		enum: FulfillmentStatus,
		default: 'not_fulfilled',
	})
	fulfillment_status: FulfillmentStatus;

	@DbAwareColumn({ type: 'enum', enum: PaymentStatus, default: 'not_paid' })
	payment_status: PaymentStatus;

	@Column({ type: resolveDbType('timestamptz') })
	estimated_production_time: Date;

	@Column({ type: resolveDbType('timestamptz') })
	settlement_time: Date;

	@Column({ nullable: true, type: resolveDbType('timestamptz') })
	tax_rate: number;

	@Column({ type: 'jsonb', nullable: true, default: {} })
	metadata: Record<string, unknown>;

	@Column({ type: 'boolean', nullable: true })
	no_notification: boolean;

	@OneToMany(() => SupplierOrderDocument, (sod) => sod.supplier_order, {
		cascade: ['insert', 'remove'],
	})
	documents: SupplierOrderDocument[];

	@BeforeInsert()
	private async beforeInsert(): Promise<void> {
		this.id = generateEntityId(this.id, 'so');
	}
}
