import { Repository } from "typeorm";
import { AppDataSource } from "../../database/data-source.js";
import { Service } from "../../database/entities/service.entity.js";
import { Employee } from "../../database/entities/employee.entity.js";
import { BusinessHour } from "../../database/entities/business-hour.entity.js";
import { BlockedTime } from "../../database/entities/blocked-time.entity.js";

export class ConfigurationRepository {
  private readonly services: Repository<Service>;
  private readonly employees: Repository<Employee>;
  private readonly businessHours: Repository<BusinessHour>;
  private readonly blockedTimes: Repository<BlockedTime>;

  constructor() {
    this.services = AppDataSource.getRepository(Service);
    this.employees = AppDataSource.getRepository(Employee);
    this.businessHours = AppDataSource.getRepository(BusinessHour);
    this.blockedTimes = AppDataSource.getRepository(BlockedTime);
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

  async createBlockedTime(
    tenantId: string,
    startsAt: Date,
    endsAt: Date,
    reason: string | null
  ): Promise<BlockedTime> {
    return this.blockedTimes.save(
      this.blockedTimes.create({ tenantId, startsAt, endsAt, reason })
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

  findBusinessHoursByTenant(tenantId: string): Promise<BusinessHour[]> {
    return this.businessHours.find({
      where: { tenantId },
      order: { dayOfWeek: "ASC", startTime: "ASC" }
    });
  }

  findBlockedTimesByTenant(tenantId: string): Promise<BlockedTime[]> {
    return this.blockedTimes.find({
      where: { tenantId },
      order: { startsAt: "ASC" }
    });
  }
}
