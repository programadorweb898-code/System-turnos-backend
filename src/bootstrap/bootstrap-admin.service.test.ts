import bcrypt from "bcryptjs";
import { EntityManager } from "typeorm";
import { Tenant } from "../database/entities/tenant.entity.js";
import { User } from "../database/entities/user.entity.js";
import { TenantRepository } from "../modules/tenant/tenant.repository.js";
import { TenantSlugAlreadyExistsError } from "../modules/tenant/tenant.service.js";
import { UserRepository } from "../modules/auth/user.repository.js";
import {
  MAX_PASSWORD_BYTES,
  MIN_PASSWORD_LENGTH
} from "../modules/auth/user.validation.js";
import {
  AdminEmailAlreadyExistsError,
  BootstrapAdminService,
  createBootstrapAdminService
} from "./bootstrap-admin.service.js";

describe("BootstrapAdminService", () => {
  const validInput = {
    businessName: "Peluquería Luis",
    businessSlug: "peluqueria-luis",
    timezone: "America/Argentina/Buenos_Aires",
    adminEmail: "admin@peluqueria-luis.test",
    adminPassword: "una-clave-larga-1",
    maxDailyAppointments: 10,
    minimumBookingNoticeHours: 2
  };

  function createTenantRepositoryMock() {
    return {
      findBySlug: jest.fn(),
      create: jest.fn()
    } as unknown as jest.Mocked<TenantRepository>;
  }

  function createUserRepositoryMock() {
    return {
      findByEmail: jest.fn(),
      create: jest.fn()
    } as unknown as jest.Mocked<UserRepository>;
  }

  function createService(
    tenantRepository = createTenantRepositoryMock(),
    userRepository = createUserRepositoryMock()
  ): BootstrapAdminService {
    return new BootstrapAdminService(tenantRepository, userRepository);
  }

  it("crea el negocio y su administrador con las reglas configuradas", async () => {
    const tenantRepository = createTenantRepositoryMock();
    const userRepository = createUserRepositoryMock();

    tenantRepository.findBySlug.mockResolvedValue(null);
    tenantRepository.create.mockResolvedValue({
      id: "tenant-1",
      slug: validInput.businessSlug
    } as Tenant);
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.create.mockResolvedValue({
      id: "user-1",
      email: validInput.adminEmail
    } as User);

    const result = await createService(tenantRepository, userRepository).run(
      validInput
    );

    expect(tenantRepository.create).toHaveBeenCalledWith(
      validInput.businessName,
      validInput.businessSlug,
      validInput.timezone,
      validInput.maxDailyAppointments,
      validInput.minimumBookingNoticeHours
    );
    expect(userRepository.create).toHaveBeenCalledWith(
      validInput.adminEmail,
      validInput.adminPassword,
      "tenant-1"
    );
    expect(result).toEqual({
      tenantId: "tenant-1",
      tenantSlug: validInput.businessSlug,
      adminUserId: "user-1",
      adminEmail: validInput.adminEmail
    });
  });

  it("deja los limites de reserva en los valores por defecto si no se pasan", async () => {
    const tenantRepository = createTenantRepositoryMock();
    const userRepository = createUserRepositoryMock();

    tenantRepository.findBySlug.mockResolvedValue(null);
    tenantRepository.create.mockResolvedValue({ id: "tenant-1" } as Tenant);
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.create.mockResolvedValue({ id: "user-1" } as User);

    await createService(tenantRepository, userRepository).run({
      businessName: validInput.businessName,
      businessSlug: validInput.businessSlug,
      timezone: validInput.timezone,
      adminEmail: validInput.adminEmail,
      adminPassword: validInput.adminPassword
    });

    expect(tenantRepository.create).toHaveBeenCalledWith(
      validInput.businessName,
      validInput.businessSlug,
      validInput.timezone,
      undefined,
      undefined
    );
  });

  it("normaliza el email antes de buscar y de guardar", async () => {
    const tenantRepository = createTenantRepositoryMock();
    const userRepository = createUserRepositoryMock();

    tenantRepository.findBySlug.mockResolvedValue(null);
    tenantRepository.create.mockResolvedValue({ id: "tenant-1" } as Tenant);
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.create.mockResolvedValue({
      id: "user-1",
      email: validInput.adminEmail
    } as User);

    await createService(tenantRepository, userRepository).run({
      ...validInput,
      adminEmail: "  Admin@Peluqueria-Luis.TEST  "
    });

    expect(userRepository.findByEmail).toHaveBeenCalledWith(
      validInput.adminEmail
    );
    expect(userRepository.create).toHaveBeenCalledWith(
      validInput.adminEmail,
      validInput.adminPassword,
      "tenant-1"
    );
  });

  it("detecta el email duplicado aunque el negocio todavia no exista", async () => {
    const tenantRepository = createTenantRepositoryMock();
    const userRepository = createUserRepositoryMock();

    tenantRepository.findBySlug.mockResolvedValue(null);
    userRepository.findByEmail.mockResolvedValue({
      id: "user-1",
      email: validInput.adminEmail
    } as User);

    await expect(
      createService(tenantRepository, userRepository).run(validInput)
    ).rejects.toBeInstanceOf(AdminEmailAlreadyExistsError);

    expect(tenantRepository.create).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it("no crea el administrador si el slug ya existe", async () => {
    const tenantRepository = createTenantRepositoryMock();
    const userRepository = createUserRepositoryMock();

    tenantRepository.findBySlug.mockResolvedValue({ id: "tenant-1" } as Tenant);

    await expect(
      createService(tenantRepository, userRepository).run(validInput)
    ).rejects.toBeInstanceOf(TenantSlugAlreadyExistsError);

    expect(tenantRepository.create).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it.each([
    ["email invalido", { adminEmail: "no-es-un-email" }],
    ["email vacio", { adminEmail: "   " }],
    [
      "contrasena corta",
      { adminPassword: "corta-1234" }
    ],
    [
      "contrasena mas larga que el limite de bcrypt",
      { adminPassword: "a".repeat(MAX_PASSWORD_BYTES + 1) }
    ],
    ["nombre vacio", { businessName: "  " }],
    ["slug invalido", { businessSlug: "Peluqueria Luis" }],
    ["zona horaria invalida", { timezone: "Argentina/Buenos Aires" }],
    [
      "maxima diaria negativa",
      { maxDailyAppointments: -1 }
    ]
  ])("rechaza el alta con %s", async (_case, overrides) => {
    const tenantRepository = createTenantRepositoryMock();
    const userRepository = createUserRepositoryMock();

    await expect(
      createService(tenantRepository, userRepository).run({
        ...validInput,
        ...overrides
      })
    ).rejects.toThrow();

    expect(tenantRepository.create).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it("exige una contrasena de al menos el minimo definido", async () => {
    const tenantRepository = createTenantRepositoryMock();
    const userRepository = createUserRepositoryMock();
    tenantRepository.findBySlug.mockResolvedValue(null);
    tenantRepository.create.mockResolvedValue({ id: "tenant-1" } as Tenant);
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.create.mockResolvedValue({ id: "user-1" } as User);

    const service = createService(tenantRepository, userRepository);

    await expect(
      service.run({
        ...validInput,
        adminPassword: "a".repeat(MIN_PASSWORD_LENGTH - 1)
      })
    ).rejects.toThrow(`al menos ${MIN_PASSWORD_LENGTH} caracteres`);

    await expect(
      service.run({
        ...validInput,
        adminPassword: "a".repeat(MIN_PASSWORD_LENGTH)
      })
    ).resolves.toBeDefined();
  });

  it("rechaza un email mas largo que la columna de la base", async () => {
    const service = createService();

    await expect(
      service.run({
        ...validInput,
        adminEmail: `${"a".repeat(250)}@example.test`
      })
    ).rejects.toThrow("255 caracteres");
  });

  it("escribe el negocio y el usuario a traves del manager de la transaccion", async () => {
    const saveTenant = jest.fn(async (values: unknown) => values);
    const saveUser = jest.fn(async (values: unknown) => values);
    const repositories = new Map<unknown, unknown>([
      [
        Tenant,
        {
          findOne: jest.fn().mockResolvedValue(null),
          create: jest.fn((values: unknown) => values),
          save: saveTenant
        }
      ],
      [
        User,
        {
          findOne: jest.fn().mockResolvedValue(null),
          create: jest.fn((values: unknown) => values),
          save: saveUser
        }
      ]
    ]);
    const manager = {
      getRepository: jest.fn((entity: unknown) => repositories.get(entity))
    } as unknown as EntityManager;

    const result = await createBootstrapAdminService(manager).run(validInput);

    expect(manager.getRepository).toHaveBeenCalledWith(Tenant);
    expect(manager.getRepository).toHaveBeenCalledWith(User);
    expect(saveTenant).toHaveBeenCalledTimes(1);
    expect(saveUser).toHaveBeenCalledTimes(1);

    const savedUser = saveUser.mock.calls[0][0] as User;
    expect(savedUser.tenantId).toBe(result.tenantId);
    expect(savedUser.passwordHash).not.toBe(validInput.adminPassword);
    await expect(
      bcrypt.compare(validInput.adminPassword, savedUser.passwordHash)
    ).resolves.toBe(true);
  });
});
