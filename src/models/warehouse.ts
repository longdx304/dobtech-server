import { BaseEntity, generateEntityId } from '@medusajs/medusa';
import {
	BeforeInsert,
	Column,
	Entity,
	OneToMany,
	PrimaryColumn,
} from 'typeorm';
import { WarehouseInventory } from './warehouse-inventory';
import { InventoryTransaction } from './inventory-transaction';

@Entity()
export class Warehouse extends BaseEntity {
	@PrimaryColumn('varchar')
	id: string;

	@Column()
	location: string;

	@Column('int', { nullable: true })
	capacity: number;

	@OneToMany(() => WarehouseInventory, (inventory) => inventory.warehouse)
	inventories: WarehouseInventory[];

	@OneToMany(() => InventoryTransaction, (transaction) => transaction.warehouse)
	transactions: InventoryTransaction[];

	@BeforeInsert()
	private beforeInsert(): void {
		this.id = generateEntityId(this.id, 'warehouse');
	}
}
