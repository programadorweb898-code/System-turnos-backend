import { Repository } from "typeorm";
import { AppDataSource } from "../../database/data-source.js";
import { Service } from "../../database/entities/service.entity.js";
import { Employee } from "../../database/entities/employee.entity.js";
import { BusinessHour } from "../../database/entities/business-hour.entity.js";
import { BlockedTime } from "../../database/entities/blocked-time.entity.js";
import { ProfessionalService } from "../../database/entities/professional-service.entity.js";
import { Appointment } from "../../database/entities/appointment.entity.js";

export class ConfigurationRepository {
  private readonly services: Repository<Service>;
  private readonly employees: Repository<Employee>;
  private readonly businessHours: Repository<BusinessHour>;
  private readonly blockedTimes: Repository<BlockedTime>;
  private readonly professionalServices: Repository<ProfessionalService>;
  private readonly appointments: Repository<Appointment>;

  constructor() {
    this.services = AppDataSource.getRepository(Service);
    this.employees = AppDataSource.getRepository(Employee);
    this.businessHours = AppDataSource.getRepository(BusinessHour);
    this.blockedTimes = AppDataSource.getRepository(BlockedTime);
    this.professionalServices = AppDataSource.getRepository(ProfessionalService);
    this.appointments = AppDataSource.getRepository(Appointment);
  }

  async createService(
    tenantId: string,
    name: string,
    description: string | null,
    duration: number
  ): Promise<Service> {
    return this.services.save(
      this.services.create({ tenantId, name, description, duration })
    );
  }

  async createEmployee(tenantId: string, name: string): Promise<Employee> {
    return this.employees.save(this.employees.create({ tenantId, name }));
  }

  async createBusinessHour(
    tenantId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string
  ): Promise<BusinessHour> {
    return this.businessHours.save(
      this.businessHours.create({ tenantId, dayOfWeek, startTime, endTime })
    );
  }

  async findAppointmentsOverlappingBlockedTime(
    tenantId: string,
    professionalId: string | null,
    startsAt: Date,
    endsAt: Date
  ): Promise<
    Array<{ id: string; customerName: string; startAt: Date; endAt: Date }>
  > {
    const query = this.appointments
      .createQueryBuilder("appointment")
      .select([
        "appointment.id AS id",
        "appointment.customer_name AS customerName",
        "appointment.start_at AS startAt",
        "appointment.end_at AS endAt"
      ])
      .where("appointment.tenant_id = :tenantId", { tenantId })
      .andWhere("appointment.status IN ('PENDING', 'CONFIRMED')")
      .andWhere("appointment.start_at < :endsAt", { endsAt })
      .andWhere("appointment.end_at > :startsAt", { startsAt })
      .orderBy("appointment.start_at", "ASC");

    if (professionalId) {
      query.andWhere("appointment.professional_id = :professionalId", { professionalId });
    }

    return query.getRawMany();
  }

  findBlockedTimesByTenant(tenantId: string): Promise<BlockedTime[]> {
    return this.blockedTimes.find({
      where: { tenantId },
      order: { startsAt: "ASC" }
    });
  }

  async createBlockedTime(
    tenantId: string,
    startsAt: Date,
    endsAt: Date,
    reason: string | null,
    professionalId: string | null = null
  ): Promise<BlockedTime> {
    return this.blockedTimes.save(
      this.blockedTimes.create({ tenantId, startsAt, endsAt, reason, professionalId })
    );
  }

  findServicesByTenant(tenantId: string): Promise<Service[]> {
    return this.services.find({
      where: { tenantId },
      order: { name: "ASC" }
    });
  }

  findEmployeesByTenant(tenantId: string): Promise<Employee[]> {
    return this.employees.find({
      where: { tenantId },
      order: { name: "ASC" }
    });
  }

  async updateEmployeeStatus(
    tenantId: string,
    employeeId: string,
    status: Employee["status"]
  ): Promise<Employee | null> {
    const employee = await this.employees.findOne({
      where: { id: employeeId, tenantId }
    });

    if (!employee) {
      return null;
    }

    employee.status = status;
    return this.employees.save(employee);
  }

  findBusinessHoursByTenant(tenantId: string): Promise<BusinessHour[]> {
    return this.businessHours.find({
      where: { tenantId },
      order: { dayOfWeek: "ASC", startTime: "ASC" }
    });
  }

  findEmployeeByTenant(tenantId: string, employeeId: string): Promise<Employee | null> {
    return this.employees.findOne({ where: { id: employeeId, tenantId } });
  }

  async findServicesAssignedToEmployee(
    tenantId: string,
    employeeId: string
  ): Promise<Service[]> {
    const assignments = await this.professionalServices.find({
      where: { tenantId, professionalId: employeeId }
    });

    const serviceIds = assignments.map((assignment) => assignment.serviceId);

    if (serviceIds.length === 0) {
      return [];
    }

    return this.services.find({
      where: serviceIds.map((id) => ({ id, tenantId })),
      order: { name: "ASC" }
    });
  }

  async countAssignableServicesByTenant(
    tenantId: string,
    serviceIds: string[]
  ): Promise<number> {
    if (serviceIds.length === 0) {
      return 0;
    }

    return this.services.count({ where: serviceIds.map((id) => ({ id, tenantId })) });
  }

  async replaceEmployeeServiceAssignments(
    tenantId: string,
    employeeId: string,
    serviceIds: string[]
  ): Promise<void> {
    await AppDataSource.transaction(async (manager) => {
      const repository = manager.getRepository(ProfessionalService);

      await repository.delete({ tenantId, professionalId: employeeId });

      if (serviceIds.length > 0) {
        await repository.save(
          serviceIds.map((serviceId) =>
            repository.create({ tenantId, professionalId: employeeId, serviceId })
          )
        );
      }
    });
  }
}
