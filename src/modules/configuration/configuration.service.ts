import { ConfigurationRepository } from "./configuration.repository.js";
import {
  CreateBlockedTimeInput,
  CreateBusinessHourInput,
  CreateEmployeeInput,
  CreateServiceInput
} from "./configuration.types.js";
import {
  validateBlockedTimeInput,
  validateBusinessHourInput,
  validateEmployeeInput,
  validateServiceInput
} from "./configuration.validation.js";

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

  listBusinessHours(tenantId: string) {
    return this.repository.findBusinessHoursByTenant(tenantId);
  }

  listBlockedTimes(tenantId: string) {
    return this.repository.findBlockedTimesByTenant(tenantId);
  }
}
