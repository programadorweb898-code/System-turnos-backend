import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";
import { Tenant } from "./tenant.entity.js";

export const USER_ROLES = ["ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["ACTIVE", "DISABLED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true, length: 255 })
  email!: string;

  @Column({ name: "password_hash", length: 255 })
  passwordHash!: string;

  @Column({ length: 20, default: "ADMIN" })
  role!: UserRole;

  @Column({ length: 20, default: "ACTIVE" })
  status!: UserStatus;

  @ManyToOne(() => Tenant, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "tenant_id" })
  tenant!: Tenant;

  @Column({ name: "tenant_id", type: "uuid" })
  tenantId!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
