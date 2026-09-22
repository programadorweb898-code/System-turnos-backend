import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "../config/env.js";
import { Tenant } from "./entities/tenant.entity.js";
import { Service } from "./entities/service.entity.js";
import { Employee } from "./entities/employee.entity.js";
import { BusinessHour } from "./entities/business-hour.entity.js";
import { BlockedTime } from "./entities/blocked-time.entity.js";
import { User } from "./entities/user.entity.js";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: env.databaseUrl,
  synchronize: false,
  logging: false,
  entities: [Tenant, Service, Employee, BusinessHour, BlockedTime, User],
  migrations: ["dist/database/migrations/*.js"]
});
