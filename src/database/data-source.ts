import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "../config/env.js";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: env.databaseUrl,
  synchronize: false,
  logging: false,
  entities: [],
  migrations: []
});
