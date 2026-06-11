import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../entities';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.createAdminFromEnvIfMissing();
  }

  async findAdmin() {
    return this.usersRepository.findOne({ where: {}, order: { createdAt: 'ASC' } });
  }

  async findAdminOrFail() {
    const user = await this.findAdmin();
    if (!user) {
      throw new NotFoundException('Admin user was not initialized');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.usersRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async updateAdmin(dto: UpdateAdminUserDto) {
    const admin = await this.findAdminOrFail();

    if (dto.email && dto.email !== admin.email) {
      const existing = await this.findByEmail(dto.email);
      if (existing && existing.id !== admin.id) {
        throw new ConflictException('Email is already in use');
      }
      admin.email = dto.email.toLowerCase().trim();
    }

    if (dto.name) {
      admin.name = dto.name.trim();
    }

    if (dto.password) {
      admin.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    return this.usersRepository.save(admin);
  }

  private async createAdminFromEnvIfMissing() {
    const usersCount = await this.usersRepository.count();
    if (usersCount > 0) {
      return;
    }

    const email = this.config.get<string>('ADMIN_EMAIL');
    const password = this.config.get<string>('ADMIN_PASSWORD');

    if (!email || !password) {
      return;
    }

    const user = this.usersRepository.create({
      name: this.config.get<string>('ADMIN_NAME', 'Admin'),
      email: email.toLowerCase().trim(),
      passwordHash: await bcrypt.hash(password, 12),
      isActive: true,
    });

    await this.usersRepository.save(user);
  }
}
