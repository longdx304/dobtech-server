import { BaseEntity, generateEntityId } from '@medusajs/medusa';
import {
	BeforeInsert,
	Column,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	Unique,
} from 'typeorm';
import { Warehouse } from './warehouse';
import { ItemUnit } from './item-unit';
import { ProductVariant } from './product-variant';

@Entity()
@Unique(['warehouse_id', 'variant_id'])
export class WarehouseInventory extends BaseEntity {
	@PrimaryColumn('varchar')
	id: string;

	@Column('varchar')
	warehouse_id: string;

	@Column('varchar')
	variant_id: string;

	@Column('int', { default: 0 })
	quantity: number;

	@Column('varchar', { nullable: true })
	unit_id: string;

	@ManyToOne(() => ItemUnit, (item_unit) => item_unit.unit)
	@JoinColumn({ name: 'unit_id' })
	item_unit: ItemUnit;

	@ManyToOne(() => Warehouse, (warehouse) => warehouse.inventories)
	@JoinColumn({ name: 'warehouse_id' })
	warehouse: Warehouse;

	@ManyToOne(() => ProductVariant, (variant) => variant.id)
	@JoinColumn({ name: 'variant_id' })
	variant: ProductVariant;

	@BeforeInsert()
	private beforeInsert(): void {
		this.id = generateEntityId(this.id, 'wi');
	}
}
