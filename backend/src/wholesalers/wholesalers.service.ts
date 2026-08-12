import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Payment, Sale, Wholesaler } from '../entities';
import { CreateWholesalerDto } from './dto/create-wholesaler.dto';
import { UpdateWholesalerDto } from './dto/update-wholesaler.dto';

@Injectable()
export class WholesalersService {
  constructor(
    @InjectRepository(Wholesaler)
    private readonly wholesalersRepository: Repository<Wholesaler>,
    @InjectRepository(Sale)
    private readonly salesRepository: Repository<Sale>,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
  ) {}

  async findAll(query: PaginationQueryDto) {
    const where = query.search ? { name: ILike(`%${query.search}%`) } : {};
    const [data, total] = await this.wholesalersRepository.findAndCount({
      where,
      order: { name: 'ASC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return { data, total, page: query.page, limit: query.limit };
  }

  async findOne(id: string) {
    const wholesaler = await this.wholesalersRepository.findOne({ where: { id } });
    if (!wholesaler) {
      throw new NotFoundException('Wholesaler not found');
    }

    return wholesaler;
  }

  async findDetail(id: string) {
    const wholesaler = await this.findOne(id);
    const [sales, payments] = await Promise.all([
      this.salesRepository.find({
        where: { wholesaler: { id } },
        relations: { items: { product: true, stockItem: true }, payments: true },
        order: { saleDate: 'DESC', createdAt: 'DESC' },
      }),
      this.paymentsRepository.find({
        where: { wholesaler: { id } },
        relations: { sale: true },
        order: { paymentDate: 'DESC', createdAt: 'DESC' },
      }),
    ]);

    const totals = sales.reduce<Record<string, { sold: number; paid: number; balance: number }>>((result, sale) => {
      const currency = sale.currency;
      result[currency] ??= { sold: 0, paid: 0, balance: 0 };
      result[currency].sold += Number(sale.totalAmount);
      result[currency].paid += Number(sale.paidAmount);
      result[currency].balance += Number(sale.balanceAmount);
      return result;
    }, {});

    return {
      wholesaler,
      totals: Object.fromEntries(Object.entries(totals).map(([currency, values]) => [currency, {
        sold: values.sold.toFixed(2),
        paid: values.paid.toFixed(2),
        balance: values.balance.toFixed(2),
      }])),
      sales,
      payments,
    };
  }

  async create(dto: CreateWholesalerDto) {
    const wholesaler = this.wholesalersRepository.create({
      ...dto,
      name: dto.name.trim(),
      email: dto.email?.toLowerCase().trim(),
    });

    return this.wholesalersRepository.save(wholesaler);
  }

  async update(id: string, dto: UpdateWholesalerDto) {
    const wholesaler = await this.findOne(id);
    Object.assign(wholesaler, {
      ...dto,
      name: dto.name?.trim() ?? wholesaler.name,
      email: dto.email?.toLowerCase().trim() ?? wholesaler.email,
    });

    return this.wholesalersRepository.save(wholesaler);
  }

  async remove(id: string) {
    const wholesaler = await this.findOne(id);
    await this.wholesalersRepository.softRemove(wholesaler);
    return { id };
  }
}
