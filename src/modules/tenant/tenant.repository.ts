import { MoreThan, Repository } from "typeorm";
import { AppDataSource } from "../../database/data-source.js";
import { Tenant } from "../../database/entities/tenant.entity.js";
import { Service } from "../../database/entities/service.entity.js";
import { Employee } from "../../database/entities/employee.entity.js";
import { BusinessHour } from "../../database/entities/business-hour.entity.js";
import { ProfessionalService } from "../../database/entities/professional-service.entity.js";
import { isValidTimezone, SLUG_PATTERN } from "./tenant.validation.js";
import { TenantPublicationRequirements, TenantStatus } from "./tenant.types.js";

export class TenantRepository {
  private readonly repository: Repository<Tenant>;

  constructor() {
    this.repository = AppDataSource.getRepository(Tenant);
  }

  findById(id: string): Promise<Tenant | null> {
    return this.repository.findOne({ where: { id } });
  }

  findBySlug(slug: string): Promise<Tenant | null> {
    return this.repository.findOne({ where: { slug } });
  }

  async create(
    name: string,
    slug: string,
    timezone: string,
    maxDailyAppointments = 20,
    minimumBookingNoticeHours = 0
  ): Promise<Tenant> {
    const tenant = this.repository.create({
      name,
      slug,
      timezone,
      maxDailyAppointments,
      minimumBookingNoticeHours,
      status: "draft"
    });
    return this.repository.save(tenant);
  }

  async update(tenant: Tenant): Promise<Tenant> {
    return this.repository.save(tenant);
  }

  async updateStatus(id: string, status: TenantStatus): Promise<void> {
    await this.repository.update({ id }, { status });
  }

  countActiveServices(tenantId: string): Promise<number> {
    return AppDataSource.getRepository(Service).count({
      where: { tenantId, status: "active", duration: MoreThan(0) }
    });
  }

  countActiveProfessionals(tenantId: string): Promise<number> {
    return AppDataSource.getRepository(Employee).count({
      where: { tenantId, status: "active" }
    });
  }

  countValidBusinessHours(tenantId: string): Promise<number> {
    return AppDataSource.getRepository(BusinessHour)
      .createQueryBuilder("businessHour")
      .where("businessHour.tenant_id = :tenantId", { tenantId })
      .andWhere("businessHour.day_of_week >= 0")
      .andWhere("businessHour.day_of_week <= 6")
      .andWhere("businessHour.end_time > businessHour.start_time")
      .getCount();
  }

  async findPublicationRequirements(
    tenant: Tenant
  ): Promise<TenantPublicationRequirements> {
    const [activeServices, activeProfessionals, businessHours, eligibleAssignments] =
      await Promise.all([
        this.countActiveServices(tenant.id),
        this.countActiveProfessionals(tenant.id),
        this.countValidBusinessHours(tenant.id),
        this.countEligibleAssignments(tenant.id)
      ]);

    return {
      hasName: tenant.name.trim().length > 0,
      hasValidSlug: SLUG_PATTERN.test(tenant.slug),
      hasValidTimezone: isValidTimezone(tenant.timezone),
      hasActiveService: activeServices > 0,
      hasActiveProfessional: activeProfessionals > 0,
      hasEligibleAssignment: eligibleAssignments > 0,
      hasBusinessHours: businessHours > 0
    };
  }

  private countEligibleAssignments(tenantId: string): Promise<number> {
    return AppDataSource.getRepository(ProfessionalService)
      .createQueryBuilder("assignment")
      .innerJoin(Employee, "employee", "employee.id = assignment.professional_id")
      .innerJoin(Service, "service", "service.id = assignment.service_id")
      .where("assignment.tenant_id = :tenantId", { tenantId })
      .andWhere("employee.tenant_id = :tenantId", { tenantId })
      .andWhere("service.tenant_id = :tenantId", { tenantId })
      .andWhere("employee.status = :employeeStatus", { employeeStatus: "active" })
      .andWhere("service.status = :serviceStatus", { serviceStatus: "active" })
      .andWhere("service.duration > 0")
      .getCount();
  }
}
