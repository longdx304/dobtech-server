import {
  // alias the core entity to not cause a naming conflict
  Order as MedusaOrder,
  User,
} from '@medusajs/medusa';
import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';

@Entity()
export class Order extends MedusaOrder {
	@Index()
	@Column()
	handler_id: string;

	@OneToOne(() => User)
	@JoinColumn({ name: 'handler_id' })
	handler: User;
}
