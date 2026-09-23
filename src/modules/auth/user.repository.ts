import { Repository } from "typeorm";
import { AppDataSource } from "../../database/data-source.js";
import { User } from "../../database/entities/user.entity.js";

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

  save(user: User): Promise<User> {
    return this.repository.save(user);
  }
}
