import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Product } from '../entities';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async findAll(query: PaginationQueryDto) {
    const where = query.search ? { name: ILike(`%${query.search}%`) } : {};
    const [data, total] = await this.productsRepository.findAndCount({
      where,
      order: { name: 'ASC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return { data, total, page: query.page, limit: query.limit };
  }

  async findOne(id: string) {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async create(dto: CreateProductDto) {
    const product = this.productsRepository.create({
      ...dto,
      name: dto.name.trim(),
      model: dto.model?.trim(),
      brand: dto.brand?.trim(),
    });

    return this.productsRepository.save(product);
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.findOne(id);
    Object.assign(product, {
      ...dto,
      name: dto.name?.trim() ?? product.name,
      model: dto.model?.trim() ?? product.model,
      brand: dto.brand?.trim() ?? product.brand,
    });

    return this.productsRepository.save(product);
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    await this.productsRepository.softRemove(product);
    return { id };
  }
}
