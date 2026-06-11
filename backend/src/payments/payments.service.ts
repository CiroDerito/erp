import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { resolvePaymentStatus, toMoney, toNumber } from '../common/utils/money';
import { Payment, Purchase, Sale, Supplier, Wholesaler } from '../entities';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
  ) {}

  async findAll(query: PaginationQueryDto) {
    const [data, total] = await this.paymentsRepository.findAndCount({
      relations: { wholesaler: true, sale: true, supplier: true, purchase: true },
      order: { paymentDate: 'DESC', createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return { data, total, page: query.page, limit: query.limit };
  }

  async findOne(id: string) {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: { wholesaler: true, sale: true, supplier: true, purchase: true },
    });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    return payment;
  }

  async create(dto: CreatePaymentDto) {
    return this.dataSource.transaction(async (manager) => {
      if (!dto.saleId && !dto.purchaseId) {
        throw new BadRequestException('El pago debe asociarse a una venta o una compra');
      }
      if (dto.saleId && dto.purchaseId) {
        throw new BadRequestException('El pago no puede asociarse a venta y compra al mismo tiempo');
      }

      const sale = dto.saleId ? await manager.findOne(Sale, { where: { id: dto.saleId }, relations: { wholesaler: true } }) : null;
      if (dto.saleId && !sale) {
        throw new NotFoundException('Venta no encontrada');
      }

      const purchase = dto.purchaseId ? await manager.findOne(Purchase, { where: { id: dto.purchaseId }, relations: { supplier: true } }) : null;
      if (dto.purchaseId && !purchase) {
        throw new NotFoundException('Compra no encontrada');
      }

      const wholesaler = sale?.wholesaler ?? (dto.wholesalerId ? await manager.findOne(Wholesaler, { where: { id: dto.wholesalerId } }) : null);
      if (dto.wholesalerId && !wholesaler) {
        throw new NotFoundException('Mayorista no encontrado');
      }
      if (sale && dto.wholesalerId && sale.wholesaler.id !== dto.wholesalerId) {
        throw new BadRequestException('La venta no pertenece al mayorista seleccionado');
      }

      const supplier = purchase?.supplier ?? (dto.supplierId ? await manager.findOne(Supplier, { where: { id: dto.supplierId } }) : null);
      if (dto.supplierId && !supplier) {
        throw new NotFoundException('Proveedor no encontrado');
      }
      if (purchase && dto.supplierId && purchase.supplier.id !== dto.supplierId) {
        throw new BadRequestException('La compra no pertenece al proveedor seleccionado');
      }

      const amount = toNumber(dto.amount);
      if (amount <= 0) {
        throw new BadRequestException('El monto debe ser mayor a 0');
      }
      const usdRate = toNumber(dto.usdRateArs);
      const usdAmount = dto.currency === 'USD' ? amount : usdRate > 0 ? amount / usdRate : null;

      const payment = manager.create(Payment, {
        wholesaler,
        sale,
        supplier,
        purchase,
        paymentDate: dto.paymentDate,
        amount: toMoney(amount),
        currency: dto.currency,
        usdRateArs: dto.currency === 'USD' ? toMoney(1) : dto.usdRateArs ? toMoney(usdRate) : null,
        usdAmount: usdAmount === null ? null : toMoney(usdAmount),
        method: dto.method,
        observations: dto.observations,
      });
      await manager.save(payment);

      if (sale) {
        const total = toNumber(sale.totalAmount);
        const paid = Math.min(toNumber(sale.paidAmount) + amount, total);
        sale.paidAmount = toMoney(paid);
        sale.balanceAmount = toMoney(Math.max(total - paid, 0));
        sale.status = resolvePaymentStatus(total, paid);
        await manager.save(sale);
      }

      if (purchase) {
        const total = toNumber(purchase.totalAmount);
        const paid = Math.min(toNumber(purchase.paidAmount) + amount, total);
        purchase.paidAmount = toMoney(paid);
        purchase.balanceAmount = toMoney(Math.max(total - paid, 0));
        purchase.status = resolvePaymentStatus(total, paid);
        await manager.save(purchase);
      }

      const createdPayment = await manager.findOne(Payment, {
        where: { id: payment.id },
        relations: { wholesaler: true, sale: true, supplier: true, purchase: true },
      });
      if (!createdPayment) {
        throw new NotFoundException('Pago no encontrado');
      }

      return createdPayment;
    });
  }
}
