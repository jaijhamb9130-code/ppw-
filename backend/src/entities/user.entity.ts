import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string; // Storing plain text for now as per "simple auth" request, or hash if desired. Let's do simple first or simple hash.
  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  number: string;

  @Column({ default: 'user' }) // admin, manager, employee
  role: string;

  @Column({ type: 'simple-json', nullable: true })
  permissions: any;
}
