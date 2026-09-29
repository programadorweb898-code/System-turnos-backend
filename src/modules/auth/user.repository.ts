import bcrypt from "bcryptjs";
import { Repository } from "typeorm";
import { AppDataSource } from "../../database/data-source.js";
import { User } from "../../database/entities/user.entity.js";
import { UserRole } from "./auth.constants.js";

const BCRYPT_ROUNDS = 12;
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;

export class UserRepository {
  private readonly repository: Repository<User>;

  constructor(repository: Repository<User> = AppDataSource.getRepository(User)) {
    this.repository = repository;
  }

  findById(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  // La contraseña llega en claro y se hashea dentro de save(): ningun
  // repositorio debe recibir ni persistir una contraseña sin hashear.
  create(
    email: string,
    password: string,
    tenantId: string,
    role: UserRole = "ADMIN"
  ): Promise<User> {
    const user = this.repository.create({
      email,
      passwordHash: password,
      role,
      status: "ACTIVE",
      tenantId
    });

    return this.save(user);
  }

  async save(user: User): Promise<User> {
    if (!BCRYPT_HASH_PATTERN.test(user.passwordHash)) {
      user.passwordHash = await bcrypt.hash(user.passwordHash, BCRYPT_ROUNDS);
    }

    return this.repository.save(user);
  }
}