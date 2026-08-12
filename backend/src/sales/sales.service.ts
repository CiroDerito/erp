import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { StockStatus } from '../common/enums/stock-status.enum';
import { resolvePaymentStatus, toMoney, toNumber } from '../common/utils/money';
import { Product, Sale, SaleItem, StockItem, Wholesaler } from '../entities';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';

@Injectable()
export class SalesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Sale)
    private readonly salesRepository: Repository<Sale>,
  ) {}

  async findAll(query: PaginationQueryDto) {
    const [data, total] = await this.salesRepository.findAndCount({
      relations: { wholesaler: true, items: { product: true, stockItem: true }, payments: true },
      order: { saleDate: 'DESC', createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return { data, total, page: query.page, limit: query.limit };
  }

  async getMonthlyTotal(month?: string) {
    const selectedMonth = /^\d{4}-\d{2}$/.test(month ?? '') ? month! : new Date().toISOString().slice(0, 7);
    const [year, monthNumber] = selectedMonth.split('-').map(Number);
    const start = `${selectedMonth}-01`;
    const end = `${year}-${String(monthNumber + 1).padStart(2, '0')}-01`;
    const normalizedEnd = monthNumber === 12 ? `${year + 1}-01-01` : end;

    const rows = await this.salesRepository.createQueryBuilder('sale')
      .select('sale.currency', 'currency')
      .addSelect('COUNT(sale.id)', 'salesCount')
      .addSelect('COALESCE(SUM(sale.total_amount), 0)', 'total')
      .where('sale.sale_date >= :start', { start })
      .andWhere('sale.sale_date < :end', { end: normalizedEnd })
      .groupBy('sale.currency')
      .getRawMany<{ currency: string; salesCount: string; total: string }>();

    return {
      month: selectedMonth,
      salesCount: rows.reduce((sum, row) => sum + Number(row.salesCount), 0),
      byCurrency: Object.fromEntries(rows.map((row) => [row.currency, Number(row.total).toFixed(2)])),
    };
  }

  async findOne(id: string) {
    const sale = await this.salesRepository.findOne({
      where: { id },
      relations: { wholesaler: true, items: { product: true, stockItem: true }, payments: true },
    });
    if (!sale) {
      throw new NotFoundException('Venta no encontrada');
    }

    return sale;
  }

  async create(dto: CreateSaleDto) {
    return this.dataSource.transaction(async (manager) => {
      const wholesaler = await manager.findOne(Wholesaler, { where: { id: dto.wholesalerId } });
      if (!wholesaler) {
        throw new NotFoundException('Mayorista no encontrado');
      }

      const subtotal = dto.items.reduce((sum, item) => {
        if (toNumber(item.unitPrice) <= 0) {
          throw new BadRequestException('El precio unitario debe ser mayor a 0');
        }
        if ((item.stockItemId || item.stockItemImei) && item.quantity !== 1) {
          throw new BadRequestException('La cantidad para un IMEI de stock debe ser 1');
        }
        if (!(item.stockItemId || item.stockItemImei) && item.quantity <= 0) {
          throw new BadRequestException('La cantidad debe ser mayor a 0');
        }

        const quantity = item.stockItemId || item.stockItemImei ? 1 : item.quantity;
        return sum + quantity * toNumber(item.unitPrice);
      }, 0);
      const discount = toNumber(dto.discountAmount);
      const total = Math.max(subtotal - discount, 0);
      const paid = toNumber(dto.paidAmount);
      if (paid < 0) {
        throw new BadRequestException('El pagado no puede ser menor a 0');
      }

      const sale = manager.create(Sale, {
        wholesaler,
        saleDate: dto.saleDate,
        dueDate: dto.dueDate,
        currency: dto.currency,
        subtotalAmount: toMoney(subtotal),
        discountAmount: toMoney(discount),
        totalAmount: toMoney(total),
        paidAmount: toMoney(paid),
        balanceAmount: toMoney(Math.max(total - paid, 0)),
        status: resolvePaymentStatus(total, paid),
        notes: dto.notes,
      });
      await manager.save(sale);
      const saleItems: SaleItem[] = [];

      for (const itemDto of dto.items) {
        if (itemDto.stockItemId || itemDto.stockItemImei) {
          const stockItem = await manager.findOne(StockItem, {
            where: itemDto.stockItemId
              ? { id: itemDto.stockItemId }
              : { imei: itemDto.stockItemImei?.trim() },
            relations: { product: true },
          });
          if (!stockItem) {
            throw new NotFoundException('Producto de stock no encontrado');
          }
          if (stockItem.status !== StockStatus.AVAILABLE) {
            throw new BadRequestException(`El IMEI no esta disponible: ${stockItem.imei}`);
          }

          const saleItem = manager.create(SaleItem, {
            sale,
            product: stockItem.product,
            stockItem,
            quantity: 1,
            unitPrice: toMoney(toNumber(itemDto.unitPrice)),
            subtotalAmount: toMoney(toNumber(itemDto.unitPrice)),
            isExternalProduct: false,
          });
          await manager.save(saleItem);
          saleItems.push(saleItem);

          stockItem.status = StockStatus.SOLD;
          await manager.save(stockItem);
          continue;
        }

        if (itemDto.isExternalProduct || itemDto.externalProductName) {
          const saleItem = manager.create(SaleItem, {
            sale,
            quantity: itemDto.quantity,
            unitPrice: toMoney(toNumber(itemDto.unitPrice)),
            subtotalAmount: toMoney(itemDto.quantity * toNumber(itemDto.unitPrice)),
            isExternalProduct: true,
            externalProductName: itemDto.externalProductName?.trim() ?? 'Producto externo',
          });
          await manager.save(saleItem);
          saleItems.push(saleItem);
          continue;
        }

        if (!itemDto.productId) {
          throw new BadRequestException('La venta requiere un producto de stock o un producto externo');
        }

        const product = await manager.findOne(Product, { where: { id: itemDto.productId } });
        if (!product) {
          throw new NotFoundException('Producto no encontrado');
        }

        const saleItem = manager.create(SaleItem, {
          sale,
          product,
          quantity: itemDto.quantity,
          unitPrice: toMoney(toNumber(itemDto.unitPrice)),
          subtotalAmount: toMoney(itemDto.quantity * toNumber(itemDto.unitPrice)),
          isExternalProduct: false,
        });
        await manager.save(saleItem);
        saleItems.push(saleItem);
      }

      sale.items = saleItems;
      sale.payments = [];

      return sale;
    });
  }

  async update(id: string, dto: UpdateSaleDto) {
    return this.dataSource.transaction(async (manager) => {
      const sale = await manager.findOne(Sale, {
        where: { id },
        relations: { wholesaler: true, items: { product: true, stockItem: true }, payments: true },
      });
      if (!sale) {
        throw new NotFoundException('Venta no encontrada');
      }

      if (dto.wholesalerId) {
        const wholesaler = await manager.findOne(Wholesaler, { where: { id: dto.wholesalerId } });
        if (!wholesaler) {
          throw new NotFoundException('Mayorista no encontrado');
        }
        sale.wholesaler = wholesaler;
      }

      const paid = dto.paidAmount !== undefined ? toNumber(dto.paidAmount) : toNumber(sale.paidAmount);
      if (paid < 0) {
        throw new BadRequestException('El pagado no puede ser menor a 0');
      }

      const total = toNumber(sale.totalAmount);
      sale.saleDate = dto.saleDate ?? sale.saleDate;
      sale.dueDate = dto.dueDate ?? sale.dueDate;
      sale.currency = dto.currency ?? sale.currency;
      sale.paidAmount = toMoney(Math.min(paid, total));
      sale.balanceAmount = toMoney(Math.max(total - paid, 0));
      sale.status = resolvePaymentStatus(total, paid);
      sale.notes = dto.notes ?? sale.notes;

      await manager.save(sale);
      return sale;
    });
  }
}
