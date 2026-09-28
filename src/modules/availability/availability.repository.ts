import { DataSource } from "typeorm";
import { AppDataSource } from "../../database/data-source.js";
import { Appointment } from "../../database/entities/appointment.entity.js";
import { BlockedTime } from "../../database/entities/blocked-time.entity.js";
import { BusinessHour } from "../../database/entities/business-hour.entity.js";
import { Employee } from "../../database/entities/employee.entity.js";
import { ProfessionalService } from "../../database/entities/professional-service.entity.js";
import { Service } from "../../database/entities/service.entity.js";
import { Tenant } from "../../database/entities/tenant.entity.js";

export interface AvailabilityContext {
  tenant: Tenant;
  service: Service;
  businessHours: BusinessHour[];
  professionals: Employee[];
  appointments: Appointment[];
  blockedTimes: BlockedTime[];
  dailyAppointments: number;
}

export class AvailabilityRepository {
  constructor(private readonly dataSource: DataSource = AppDataSource) {}

  async getTenantTimezone(tenantId: string): Promise<string | null> {
    const tenant = await this.dataSource.getRepository(Tenant).findOne({
      where: { id: tenantId, status: "published" }
    });
    return tenant?.timezone ?? null;
  }

  async getContext(tenantId: string, serviceId: string, professionalId: string | undefined, rangeStart: Date, rangeEnd: Date): Promise<AvailabilityContext | null> {
    const tenant = await this.dataSource.getRepository(Tenant).findOne({
      where: { id: tenantId, status: "published" }
    });
    if (!tenant) return null;

    const service = await this.dataSource.getRepository(Service).findOne({
      where: { id: serviceId, tenantId, status: "active" }
    });
    if (!service) return null;

    const businessHours = await this.dataSource.getRepository(BusinessHour).find({
      where: { tenantId },
      order: { dayOfWeek: "ASC", startTime: "ASC" }
    });

    const assignmentQuery = this.dataSource.getRepository(ProfessionalService)
      .createQueryBuilder("assignment")
      .innerJoinAndSelect(Employee, "professional", "professional.id = assignment.professional_id")
      .where("assignment.tenant_id = :tenantId", { tenantId })
      .andWhere("assignment.service_id = :serviceId", { serviceId })
      .andWhere("professional.tenant_id = :tenantId", { tenantId })
      .andWhere("professional.status = 'active'");

    if (professionalId) {
      assignmentQuery.andWhere("professional.id = :professionalId", { professionalId });
    }

    const assignments = await assignmentQuery.getRawMany<{ professional_id: string; professional_name: string }>();

    const professionals = assignments.map((row) => {
      const professional = new Employee();
      professional.id = row.professional_id;
      professional.tenantId = tenantId;
      professional.name = row.professional_name;
      professional.status = "active";
      return professional;
    });

    const professionalIds = professionals.map((item) => item.id);

    const appointments = professionalIds.length
      ? await this.dataSource.getRepository(Appointment)
          .createQueryBuilder("appointment")
          .where("appointment.tenant_id = :tenantId", { tenantId })
          .andWhere("appointment.professional_id IN (:...professionalIds)", { professionalIds })
          .andWhere("appointment.status IN ('PENDING', 'CONFIRMED')")
          .andWhere("appointment.start_at < :rangeEnd", { rangeEnd })
          .andWhere("appointment.end_at > :rangeStart", { rangeStart })
          .getMany()
      : [];

    const blockedQuery = this.dataSource.getRepository(BlockedTime)
      .createQueryBuilder("blocked")
      .where("blocked.tenant_id = :tenantId", { tenantId })
      .andWhere("blocked.starts_at < :rangeEnd", { rangeEnd })
      .andWhere("blocked.ends_at > :rangeStart", { rangeStart });

    if (professionalIds.length) {
      blockedQuery.andWhere(
        "(blocked.professional_id IS NULL OR blocked.professional_id IN (:...professionalIds))",
        { professionalIds }
      );
    } else {
      blockedQuery.andWhere("blocked.professional_id IS NULL");
    }

    const blockedTimes = await blockedQuery.getMany();

    const dailyAppointments = await this.dataSource.getRepository(Appointment)
      .createQueryBuilder("appointment")
      .where("appointment.tenant_id = :tenantId", { tenantId })
      .andWhere("appointment.status IN ('PENDING', 'CONFIRMED')")
      .andWhere("appointment.start_at >= :rangeStart", { rangeStart })
      .andWhere("appointment.start_at < :rangeEnd", { rangeEnd })
      .getCount();

    return { tenant, service, businessHours, professionals, appointments, blockedTimes, dailyAppointments };
  }
}
