import { WebsiteIntegration } from "../../database/entities/website-integration.entity.js";
import {
  WebsiteIntegrationAlreadyExistsError,
  WebsiteIntegrationNotVerifiedError,
  WebsiteIntegrationService,
  WebsiteIntegrationVerificationFailedError
} from "./website-integration.service.js";
import { WebsiteIntegrationRepository } from "./website-integration.repository.js";
import { DomainVerificationProvider } from "./domain-verification.js";

function createIntegration(
  overrides: Partial<WebsiteIntegration> = {}
): WebsiteIntegration {
  return Object.assign(new WebsiteIntegration(), {
    id: "00000000-0000-4000-8000-000000000010",
    tenantId: "00000000-0000-4000-8000-000000000001",
    domain: "peluqueriajuan.com",
    publicKey: "pk_live_test",
    verificationToken: "turnos-verification=test",
    verificationStatus: "PENDING",
    verificationMethod: null,
    integrationProvider: "CUSTOM",
    integrationStatus: "NOT_CONFIGURED",
    verifiedAt: null,
    connectedAt: null,
    createdAt: new Date("2099-01-01T00:00:00.000Z"),
    updatedAt: new Date("2099-01-01T00:00:00.000Z"),
    ...overrides
  });
}

describe("WebsiteIntegrationService", () => {
  it("creates an integration with a normalized domain", async () => {
    const created = createIntegration({ domain: "peluqueriajuan.com" });
    const repository = {
      findByDomain: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(created)
    } as unknown as WebsiteIntegrationRepository;

    const service = new WebsiteIntegrationService(repository);

    const result = await service.create({
      tenantId: "00000000-0000-4000-8000-000000000001",
      domain: " WWW.PeluqueriaJuan.com. "
    });

    expect(repository.create).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000001",
      "peluqueriajuan.com",
      expect.stringMatching(/^pk_live_/),
      expect.stringMatching(/^turnos-verification=/),
      "CUSTOM"
    );
    expect(result).toBe(created);
  });

  it("rejects a domain already registered", async () => {
    const repository = {
      findByDomain: jest.fn().mockResolvedValue(createIntegration())
    } as unknown as WebsiteIntegrationRepository;

    const service = new WebsiteIntegrationService(repository);

    await expect(
      service.create({
        tenantId: "00000000-0000-4000-8000-000000000001",
        domain: "peluqueriajuan.com"
      })
    ).rejects.toBeInstanceOf(WebsiteIntegrationAlreadyExistsError);
  });

  it("marks an integration as verified when DNS verification succeeds", async () => {
    const integration = createIntegration();
    const verified = createIntegration({
      verificationStatus: "VERIFIED",
      verificationMethod: "DNS",
      verifiedAt: new Date()
    });

    const repository = {
      findById: jest.fn().mockResolvedValue(integration),
      markVerified: jest.fn().mockResolvedValue(verified)
    } as unknown as WebsiteIntegrationRepository;

    const provider: DomainVerificationProvider = {
      verify: jest.fn().mockResolvedValue(true)
    };

    const service = new WebsiteIntegrationService(repository, provider);

    await expect(
      service.verify(integration.id, integration.tenantId)
    ).resolves.toBe(verified);
    expect(provider.verify).toHaveBeenCalledWith(
      integration.domain,
      integration.verificationToken
    );
  });

  it("marks verification as failed when DNS verification does not match", async () => {
    const integration = createIntegration();
    const repository = {
      findById: jest.fn().mockResolvedValue(integration),
      markVerificationFailed: jest.fn().mockResolvedValue(integration)
    } as unknown as WebsiteIntegrationRepository;

    const provider: DomainVerificationProvider = {
      verify: jest.fn().mockResolvedValue(false)
    };

    const service = new WebsiteIntegrationService(repository, provider);

    await expect(
      service.verify(integration.id, integration.tenantId)
    ).rejects.toBeInstanceOf(WebsiteIntegrationVerificationFailedError);

    expect(repository.markVerificationFailed).toHaveBeenCalledWith(
      integration.id,
      integration.tenantId
    );
  });

  it("does not allow connection before domain verification", async () => {
    const integration = createIntegration();
    const repository = {
      findById: jest.fn().mockResolvedValue(integration),
      connect: jest.fn()
    } as unknown as WebsiteIntegrationRepository;

    const service = new WebsiteIntegrationService(repository);

    await expect(
      service.connect(integration.id, integration.tenantId)
    ).rejects.toBeInstanceOf(WebsiteIntegrationNotVerifiedError);

    expect(repository.connect).not.toHaveBeenCalled();
  });

  it("connects an already verified integration", async () => {
    const integration = createIntegration({
      verificationStatus: "VERIFIED",
      verificationMethod: "DNS"
    });
    const connected = createIntegration({
      verificationStatus: "VERIFIED",
      verificationMethod: "DNS",
      integrationStatus: "CONNECTED",
      connectedAt: new Date()
    });

    const repository = {
      findById: jest.fn().mockResolvedValue(integration),
      connect: jest.fn().mockResolvedValue(connected)
    } as unknown as WebsiteIntegrationRepository;

    const service = new WebsiteIntegrationService(repository);

    await expect(
      service.connect(integration.id, integration.tenantId)
    ).resolves.toBe(connected);
    expect(repository.connect).toHaveBeenCalledWith(
      integration.id,
      integration.tenantId
    );
  });
});
