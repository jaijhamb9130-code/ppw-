import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class StockItem {
  @PrimaryColumn()
  masterid: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  parent: string;

  @Column({ nullable: true })
  group: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  base_units: string;

  @Column({ nullable: true })
  hsn: string;

  @Column({ nullable: true })
  closing_balance: string;

  @Column({ nullable: true })
  opening_balance: string;

  @Column({ nullable: true })
  gst: string;

  @Column({ nullable: true })
  rate_1: string;

  @Column({ nullable: true })
  rate_2: string;

  @Column({ nullable: true })
  rate_3: string;

  @Column({ nullable: true })
  rate_3a: string;

  @Column({ nullable: true })
  rate_4: string;

  @Column({ nullable: true })
  default_mrp: string;

  @Column({ nullable: true })
  ats_barcode: string;

  @Column({ nullable: true })
  last_purchase_cost: string;


  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'datetime', nullable: true })
  expiry_date: Date | null;
}
