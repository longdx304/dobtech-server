import { BaseEntity, generateEntityId } from '@medusajs/medusa';
import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Warehouse } from './warehouse';

export enum TransactionType {
	INBOUND = 'INBOUND',
	OUTBOUND = 'OUTBOUND',
}

@Entity()
export class InventoryTransaction extends BaseEntity {
	@PrimaryColumn('varchar')
	id: string;

	@Column('varchar')
	variant_id: string;

	@Column('varchar')
	warehouse_id: string;

	@Column('varchar', { nullable: true })
	order_id: string;

	@Column('int')
	quantity: number;

	@Column('varchar')
	type: TransactionType;

	@Column('varchar', { nullable: true })
	note: string;

	@Column('varchar', { nullable: true })
	user_id: string;

	@Column('jsonb', { default: {} })
	metadata: Record<string, any>;

	@ManyToOne(() => Warehouse, (warehouse) => warehouse.transactions)
	@JoinColumn({ name: 'warehouse_id' })
	warehouse: Warehouse;

	@BeforeInsert()
	private beforeInsert(): void {
		this.id = generateEntityId(this.id, 'it');
	}
}
