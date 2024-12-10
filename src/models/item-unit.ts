import { generateEntityId } from '@medusajs/medusa';
import { BeforeInsert, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class ItemUnit {
	@PrimaryColumn()
	id: string;

	@Column()
	unit: string;

	@Column()
	quantity: number;

	@BeforeInsert()
	private async beforeInsert(): Promise<void> {
		this.id = generateEntityId(this.id, 'iu');
	}
}
