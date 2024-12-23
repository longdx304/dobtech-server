import {
	DbAwareColumn,
	// alias the core entity to not cause a naming conflict
	Fulfillment as MedusaFulfillment,
	resolveDbType,
} from '@medusajs/medusa';
import { Column, Entity, Index } from 'typeorm';

export enum FulfullmentStatus {
	AWAITING = 'awaiting',
	DELIVERING = 'delivering',
	SHIPPED = 'shipped',
	CANCELED = 'canceled',
}

@Entity()
export class Fulfillment extends MedusaFulfillment {
	@Index()
	@Column({ nullable: true })
	shipped_id: string;

	@Index()
	@Column({ nullable: true })
	checker_id: string;

	@Column({ type: resolveDbType('timestamptz'), nullable: true })
	checked_at: Date | null;

	@Column({ type: 'text', nullable: true })
	checker_url: string | null;

	@Column({ type: 'text', nullable: true })
	shipped_url: string | null;

	@DbAwareColumn({
		type: 'enum',
		enum: FulfullmentStatus,
		default: 'awaiting',
	})
	status: FulfullmentStatus;
}
