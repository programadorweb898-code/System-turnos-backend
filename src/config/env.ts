import { parseTrustProxyHops, validateJwtSecret } from "./env.validation.js";

const nodeEnv = process.env.NODE_ENV ?? "development";
const jwtSecret = process.env.JWT_SECRET ?? "";

validateJwtSecret(nodeEnv, jwtSecret);

export const env = {
  nodeEnv,
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret,
  trustProxyHops: parseTrustProxyHops(process.env.TRUST_PROXY_HOPS)
};
