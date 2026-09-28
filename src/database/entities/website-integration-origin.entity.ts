import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn
} from "typeorm";

@Entity({ name: "website_integration_origins" })
export class WebsiteIntegrationOrigin {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "website_integration_id", type: "uuid" })
  websiteIntegrationId!: string;

  @Column({ length: 255 })
  origin!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
