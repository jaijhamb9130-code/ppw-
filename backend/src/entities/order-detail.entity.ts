import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { StockItem } from './stock-item.entity';

@Entity()
export class OrderDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order)
  order: Order;

  @ManyToOne(() => StockItem)
  @JoinColumn({ name: 'stock_item_id' })
  stock_item: StockItem;

  @Column({ type: 'varchar', nullable: true })
  stock_item_id: string;

  @Column({ nullable: true })
  item_name: string;

  @Column({ nullable: true })
  barcode: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  rate: number;

  @Column()
  unit: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  gst: number;

  @Column({ nullable: true })
  selected_scheme: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount_percentage: number;

  @Column({ nullable: true })
  livestock_type: string;

  @Column({ nullable: true })
  parent: string;

  @Column({ nullable: true })
  group: string;
}
