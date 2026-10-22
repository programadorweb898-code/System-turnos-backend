import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";

@Entity({ name: "tenants" })
export class Tenant {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ unique: true, length: 80 })
  slug!: string;

  @Column({ length: 100 })
  timezone!: string;

  @Column({ name: "max_daily_appointments", type: "integer", default: 20 })
  maxDailyAppointments!: number;

  @Column({ name: "minimum_booking_notice_hours", type: "integer", default: 0 })
  minimumBookingNoticeHours!: number;

  @Column({ length: 20, default: "draft" })
  status!: "draft" | "published" | "unpublished";

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
