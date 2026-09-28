import bcrypt from "bcryptjs";
import { Repository } from "typeorm";
import { AppDataSource } from "../../database/data-source.js";
import { User } from "../../database/entities/user.entity.js";

const BCRYPT_ROUNDS = 12;
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;

export class UserRepository {
  private readonly repository: Repository<User>;

  constructor() {
    this.repository = AppDataSource.getRepository(User);
  }

  findById(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  async save(user: User): Promise<User> {
    if (!BCRYPT_HASH_PATTERN.test(user.passwordHash)) {
      user.passwordHash = await bcrypt.hash(user.passwordHash, BCRYPT_ROUNDS);
    }

    return this.repository.save(user);
  }
}