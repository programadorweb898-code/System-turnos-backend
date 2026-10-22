import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, Column } from "typeorm";
import { Employee } from "./employee.entity.js";
import { Service } from "./service.entity.js";

@Entity({ name: "professional_services" })
@Unique("UQ_professional_services_professional_service", [
  "professionalId",
  "serviceId"
])
export class ProfessionalService {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "tenant_id", type: "uuid" })
  tenantId!: string;

  @Column({ name: "professional_id", type: "uuid" })
  professionalId!: string;

  @Column({ name: "service_id", type: "uuid" })
  serviceId!: string;

  @ManyToOne(() => Employee, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "professional_id" })
  professional!: Employee;

  @ManyToOne(() => Service, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "service_id" })
  service!: Service;
}
