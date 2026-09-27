import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";

export const APPOINTMENT_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW"
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

@Entity({ name: "appointments" })
export class Appointment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "tenant_id", type: "uuid" })
  tenantId!: string;

  @Column({ name: "customer_name", length: 120 })
  customerName!: string;

  @Column({ name: "customer_phone", length: 40 })
  customerPhone!: string;

  @Column({ name: "customer_notes", length: 300, nullable: true })
  customerNotes!: string | null;

  @Column({ name: "service_id", type: "uuid" })
  serviceId!: string;

  @Column({ name: "professional_id", type: "uuid" })
  professionalId!: string;

  @Column({ name: "start_at", type: "timestamptz" })
  startAt!: Date;

  @Column({ name: "end_at", type: "timestamptz" })
  endAt!: Date;

  @Column({ length: 20, default: "PENDING" })
  status!: AppointmentStatus;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
