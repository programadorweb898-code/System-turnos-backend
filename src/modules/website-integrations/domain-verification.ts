import { resolveTxt } from "node:dns/promises";

export interface DomainVerificationProvider {
  verify(domain: string, token: string): Promise<boolean>;
}

export class DnsTxtVerificationProvider implements DomainVerificationProvider {
  async verify(domain: string, token: string): Promise<boolean> {
    try {
      const records = await resolveTxt(`_turnos.${domain}`);
      return records.some((record) => record.join("") === token);
    } catch {
      return false;
    }
  }
}
