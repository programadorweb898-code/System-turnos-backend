import { Service } from "../../database/entities/service.entity.js";
import { ConfigurationRepository } from "./configuration.repository.js";
import {
  CreateBlockedTimeInput,
  CreateBusinessHourInput,
  CreateEmployeeInput,
  CreateServiceInput,
  ReplaceProfessionalServicesInput,
  UpdateEmployeeStatusInput
} from "./configuration.types.js";
import {
  validateBlockedTimeInput,
  validateBusinessHourInput,
  validateEmployeeInput,
  validateEmployeeStatusInput,
  validateReplaceProfessionalServicesInput,
  validateServiceInput
} from "./configuration.validation.js";

export class ProfessionalNotFoundError extends Error {}
export class ProfessionalServicesNotAssignableError extends Error {}

export class ConfigurationService {
  constructor(
    private readonly repository = new ConfigurationRepository()
  ) {}

  async createService(input: CreateServiceInput) {
    validateServiceInput(input);

    return this.repository.createService(
      input.tenantId,
      input.name.trim(),
      input.description?.trim() || null,
      input.duration
    );
  }

  async createEmployee(input: CreateEmployeeInput) {
    validateEmployeeInput(input);

    return this.repository.createEmployee(
      input.tenantId,
      input.name.trim()
    );
  }

  async createBusinessHour(input: CreateBusinessHourInput) {
    validateBusinessHourInput(input);

    return this.repository.createBusinessHour(
      input.tenantId,
      input.dayOfWeek,
      input.startTime,
      input.endTime
    );
  }

  async createBlockedTime(input: CreateBlockedTimeInput) {
    validateBlockedTimeInput(input);

    return this.repository.createBlockedTime(
      input.tenantId,
      input.startsAt,
      input.endsAt,
      input.reason?.trim() || null
    );
  }

  listServices(tenantId: string) {
    return this.repository.findServicesByTenant(tenantId);
  }

  listEmployees(tenantId: string) {
    return this.repository.findEmployeesByTenant(tenantId);
  }

  async updateEmployeeStatus(input: UpdateEmployeeStatusInput) {
    validateEmployeeStatusInput(input);

    return this.repository.updateEmployeeStatus(
      input.tenantId,
      input.employeeId,
      input.status
    );
  }

  listBusinessHours(tenantId: string) {
    return this.repository.findBusinessHoursByTenant(tenantId);
  }

  listBlockedTimes(tenantId: string) {
    return this.repository.findBlockedTimesByTenant(tenantId);
  }

  async listProfessionalServices(
    tenantId: string,
    professionalId: string
  ): Promise<Service[]> {
    const employee = await this.repository.findEmployeeByTenant(tenantId, professionalId);

    if (!employee) {
      throw new ProfessionalNotFoundError("El profesional no existe.");
    }

    return this.repository.findServicesAssignedToEmployee(tenantId, professionalId);
  }

  async replaceProfessionalServices(
    input: ReplaceProfessionalServicesInput
  ): Promise<Service[]> {
    validateReplaceProfessionalServicesInput(input);

    const uniqueServiceIds = [...new Set(input.serviceIds)];

    const employee = await this.repository.findEmployeeByTenant(
      input.tenantId,
      input.professionalId
    );

    if (!employee) {
      throw new ProfessionalNotFoundError("El profesional no existe.");
    }

    const assignableCount = await this.repository.countAssignableServicesByTenant(
      input.tenantId,
      uniqueServiceIds
    );

    if (assignableCount !== uniqueServiceIds.length) {
      throw new ProfessionalServicesNotAssignableError(
        "Alguno de los servicios indicados no pertenece al negocio."
      );
    }

    await this.repository.replaceEmployeeServiceAssignments(
      input.tenantId,
      input.professionalId,
      uniqueServiceIds
    );

    return this.repository.findServicesAssignedToEmployee(
      input.tenantId,
      input.professionalId
    );
  }
}
