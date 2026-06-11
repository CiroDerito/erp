import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Supplier } from '../entities';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>,
  ) {}

  async findAll(query: PaginationQueryDto) {
    const where = query.search ? { name: ILike(`%${query.search}%`) } : {};
    const [data, total] = await this.suppliersRepository.findAndCount({
      where,
      order: { name: 'ASC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return { data, total, page: query.page, limit: query.limit };
  }

  async findOne(id: string) {
    const supplier = await this.suppliersRepository.findOne({ where: { id } });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async create(dto: CreateSupplierDto) {
    const supplier = this.suppliersRepository.create({
      ...dto,
      name: dto.name.trim(),
      email: dto.email?.toLowerCase().trim(),
    });

    return this.suppliersRepository.save(supplier);
  }

  async update(id: string, dto: UpdateSupplierDto) {
    const supplier = await this.findOne(id);
    Object.assign(supplier, {
      ...dto,
      name: dto.name?.trim() ?? supplier.name,
      email: dto.email?.toLowerCase().trim() ?? supplier.email,
    });

    return this.suppliersRepository.save(supplier);
  }

  async remove(id: string) {
    const supplier = await this.findOne(id);
    await this.suppliersRepository.softRemove(supplier);
    return { id };
  }
}
