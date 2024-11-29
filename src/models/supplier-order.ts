import {
	BaseEntity,
	Cart,
	Currency,
	DbAwareColumn,
	generateEntityId,
	Payment,
	Refund,
	Region,
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
	ManyToOne,
	OneToMany,
	OneToOne,
} from 'typeorm';
import { LineItem } from './line-item';
import { OrderEdit } from './order-edit';
import { Supplier } from './supplier';
import { SupplierOrderDocument } from './supplier-order-document';
import { User } from './user';

export enum OrderStatus {
	PENDING = 'pending',
	COMPLETED = 'completed',
	ARCHIVED = 'archived',
	CANCELED = 'canceled',
	REQUIRES_ACTION = 'requires_action',
}

export enum FulfillSupplierOrderStt {
	NOT_FULFILLED = 'not_fulfilled',
	DELIVERED = 'delivered',
	INVENTORIED = 'inventoried',
	REJECTED = 'rejected',
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
		enum: FulfillSupplierOrderStt,
		default: 'not_fulfilled',
	})
	fulfillment_status: FulfillSupplierOrderStt;

	@DbAwareColumn({ type: 'enum', enum: PaymentStatus, default: 'not_paid' })
	payment_status: PaymentStatus;

	@OneToMany(() => Payment, (payment) => payment.supplier_order, {
		cascade: ['insert'],
	})
	payments: Payment[];

	@Column({ type: resolveDbType('timestamptz') })
	estimated_production_time: Date;

	@Column({ type: resolveDbType('timestamptz') })
	settlement_time: Date;

	@Column({ nullable: true, type: resolveDbType('timestamptz') })
	canceled_at: Date;

	@Column({ nullable: true, type: resolveDbType('timestamptz') })
	delivered_at: Date;

	@Column({ nullable: true, type: resolveDbType('timestamptz') })
	inventoried_at: Date;

	@Column({ nullable: true, type: resolveDbType('timestamptz') })
	rejected_at: Date;

	@Index()
	@Column()
	region_id: string;

	@ManyToOne(() => Region)
	@JoinColumn({ name: 'region_id' })
	region: Region;

	@Index()
	@Column()
	currency_code: string;

	@ManyToOne(() => Currency)
	@JoinColumn({ name: 'currency_code', referencedColumnName: 'code' })
	currency: Currency;

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

	@OneToMany(() => OrderEdit, (oe) => oe.supplier_order)
	edits: OrderEdit[];

	@OneToMany(() => Refund, (ref) => ref.supplier_order, { cascade: ['insert'] })
	refunds: Refund[];

	@OneToMany(() => LineItem, (lineItem) => lineItem.supplier_order, {
		cascade: ['insert'],
	})
	items: LineItem[];

	// Total fields
	shipping_total: number;
	tax_total: number | null;
	total: number;
	subtotal: number;
	refundable_amount: number;
	refunded_total: number;
	paid_total: number;

	@BeforeInsert()
	private async beforeInsert(): Promise<void> {
		this.id = generateEntityId(this.id, 'so');
	}
}
