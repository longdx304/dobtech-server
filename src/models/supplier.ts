import { BaseEntity, generateEntityId } from '@medusajs/medusa';
import { BeforeInsert, Column, Entity } from 'typeorm';

@Entity()
export class Supplier extends BaseEntity {
  @Column()
  email: string;

  @Column()
  supplier_name: string;

  @Column({ nullable: true }) 
  phone?: string;

  @Column({ nullable: true }) 
  address?: string;

  @Column()
  default_estimated_production_time: number;

  @Column()
  default_settlement_time: number;

  @Column({ type: 'jsonb', nullable: true, default: {} }) 
  metadata: Record<string, unknown>;

  @BeforeInsert()
  private beforeInsert(): void {
    this.id = generateEntityId(this.id, 'supplier');
  }
}
