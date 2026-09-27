import { DataSource, EntityManager, Repository } from "typeorm";
import { AppDataSource } from "../../database/data-source.js";
import { Appointment } from "../../database/entities/appointment.entity.js";
import { BlockedTime } from "../../database/entities/blocked-time.entity.js";
import { BusinessHour } from "../../database/entities/business-hour.entity.js";
import { Employee } from "../../database/entities/employee.entity.js";
import { ProfessionalService } from "../../database/entities/professional-service.entity.js";
import { Service } from "../../database/entities/service.entity.js";
import { Tenant } from "../../database/entities/tenant.entity.js";

export interface AppointmentCreationContext {
  tenant: Tenant;
  service: Service;
  professionals: Employee[];
  businessHours: BusinessHour[];
  blocked: boolean;
  dailyAppointments: number;
}

export class AppointmentRepository {
  constructor(private readonly dataSource: DataSource = AppDataSource) {}

  async getCreationContext(
    tenantId: string,
    serviceId: string,
    startAt: Date,
    endAt: Date
  ): Promise<AppointmentCreationContext | null> {
    const tenantRepository = this.dataSource.getRepository(Tenant);
    const serviceRepository = this.dataSource.getRepository(Service);
    const businessHourRepository = this.dataSource.getRepository(BusinessHour);
    const blockedTimeRepository = this.dataSource.getRepository(BlockedTime);

    const tenant = await tenantRepository.findOne({ where: { id: tenantId } });
    if (!tenant) return null;

    const service = await serviceRepository.findOne({
      where: { id: serviceId, tenantId, status: "active" }
    });
    if (!service) return null;

    const businessHours = await businessHourRepository.find({
      where: { tenantId },
      order: { dayOfWeek: "ASC", startTime: "ASC" }
    });

    const blocked = await blockedTimeRepository
      .createQueryBuilder("blocked")
      .where("blocked.tenant_id = :tenantId", { tenantId })
      .andWhere("blocked.starts_at < :endAt", { endAt })
      .andWhere("blocked.ends_at > :startAt", { startAt })
      .getExists();

    const dailyAppointments = await this.countAppointmentsForLocalDate(
      tenantId,
      startAt,
      tenant.timezone
    );

    const professionalServiceRepository =
      this.dataSource.getRepository(ProfessionalService);

    const assignments = await professionalServiceRepository
      .createQueryBuilder("assignment")
      .innerJoinAndSelect(
        Employee,
        "professional",
        "professional.id = assignment.professional_id"
      )
      .where("assignment.tenant_id = :tenantId", { tenantId })
      .andWhere("assignment.service_id = :serviceId", { serviceId })
      .andWhere("professional.tenant_id = :tenantId", { tenantId })
      .andWhere("professional.status = 'active'")
      .getRawMany<{ professional_id: string; professional_name: string }>();

    const professionals = assignments.map((row) => {
      const professional = new Employee();
      professional.id = row.professional_id;
      professional.tenantId = tenantId;
      professional.name = row.professional_name;
      professional.status = "active";
      return professional;
    });

    return { tenant, service, professionals, businessHours, blocked, dailyAppointments };
  }

  async create(
    input: {
      tenantId: string;
      customerName: string;
      customerPhone: string;
      customerNotes: string | null;
      serviceId: string;
      professionalId: string;
      startAt: Date;
      endAt: Date;
    }
  ): Promise<Appointment> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Appointment);
      const appointment = repository.create({
        ...input,
        status: "CONFIRMED"
      });

      return repository.save(appointment);
    });
  }

  async professionalHasConflict(
    professionalId: string,
    startAt: Date,
    endAt: Date
  ): Promise<boolean> {
    return this.dataSource
      .getRepository(Appointment)
      .createQueryBuilder("appointment")
      .where("appointment.professional_id = :professionalId", { professionalId })
      .andWhere("appointment.status IN ('PENDING', 'CONFIRMED')")
      .andWhere("appointment.start_at < :endAt", { endAt })
      .andWhere("appointment.end_at > :startAt", { startAt })
      .getExists();
  }

  private countAppointmentsForLocalDate(
    tenantId: string,
    instant: Date,
    timezone: string
  ): Promise<number> {
    return this.dataSource
      .getRepository(Appointment)
      .createQueryBuilder("appointment")
      .where("appointment.tenant_id = :tenantId", { tenantId })
      .andWhere("appointment.status IN ('PENDING', 'CONFIRMED')")
      .andWhere(
        "appointment.start_at >= (date_trunc('day', :instant::timestamptz AT TIME ZONE :timezone) AT TIME ZONE :timezone)",
        { instant, timezone }
      )
      .andWhere(
        "appointment.start_at < ((date_trunc('day', :instant::timestamptz AT TIME ZONE :timezone) + interval '1 day') AT TIME ZONE :timezone)",
        { instant, timezone }
      )
      .getCount();
  }
}
