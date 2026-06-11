import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, ILike, Repository } from 'typeorm';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { StockStatus } from '../common/enums/stock-status.enum';
import { resolvePaymentStatus, toMoney, toNumber } from '../common/utils/money';
import { Product, Purchase, PurchaseItem, StockItem, Supplier } from '../entities';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';

@Injectable()
export class PurchasesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Purchase)
    private readonly purchasesRepository: Repository<Purchase>,
  ) {}

  async findAll(query: PaginationQueryDto) {
    const [data, total] = await this.purchasesRepository.findAndCount({
      relations: { supplier: true, items: { product: true, stockItems: true } },
      order: { purchaseDate: 'DESC', createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return { data, total, page: query.page, limit: query.limit };
  }

  async findOne(id: string) {
    const purchase = await this.purchasesRepository.findOne({
      where: { id },
      relations: { supplier: true, items: { product: true, stockItems: true } },
    });
    if (!purchase) {
      throw new NotFoundException('Compra no encontrada');
    }

    return purchase;
  }

  async create(dto: CreatePurchaseDto) {
    return this.dataSource.transaction(async (manager) => {
      const supplier = await manager.findOne(Supplier, { where: { id: dto.supplierId } });
      if (!supplier) {
        throw new NotFoundException('Proveedor no encontrado');
      }

      const allImeis = dto.items.flatMap((item) => (item.stockCodes ?? []).map((code) => code.imei.trim()));
      if (new Set(allImeis).size !== allImeis.length) {
        throw new ConflictException('Hay IMEIs duplicados en la compra');
      }

      const total = dto.items.reduce((sum, item) => {
        if (item.quantity <= 0) {
          throw new BadRequestException('La cantidad debe ser mayor a 0');
        }
        if (toNumber(item.unitCost) <= 0) {
          throw new BadRequestException('El costo unitario debe ser mayor a 0');
        }
        if ((item.stockCodes ?? []).length > item.quantity) {
          throw new BadRequestException('La cantidad de IMEIs no puede superar la cantidad comprada');
        }
        return sum + item.quantity * toNumber(item.unitCost);
      }, 0);
      const paid = toNumber(dto.paidAmount);
      if (paid < 0) {
        throw new BadRequestException('El pagado no puede ser menor a 0');
      }

      const purchase = manager.create(Purchase, {
        supplier,
        purchaseDate: dto.purchaseDate,
        currency: dto.currency,
        totalAmount: toMoney(total),
        paidAmount: toMoney(paid),
        balanceAmount: toMoney(Math.max(total - paid, 0)),
        status: resolvePaymentStatus(total, paid),
        notes: dto.notes,
      });
      await manager.save(purchase);

      for (const itemDto of dto.items) {
        const product = await this.resolveProduct(manager, itemDto.productId, itemDto.productName);

        for (const code of itemDto.stockCodes ?? []) {
          const existing = await manager.findOne(StockItem, { where: { imei: code.imei.trim() } });
          if (existing) {
            throw new ConflictException(`El IMEI ya existe: ${code.imei}`);
          }
        }

        const purchaseItem = manager.create(PurchaseItem, {
          purchase,
          product,
          quantity: itemDto.quantity,
          unitCost: toMoney(toNumber(itemDto.unitCost)),
          subtotalAmount: toMoney(itemDto.quantity * toNumber(itemDto.unitCost)),
        });
        await manager.save(purchaseItem);

        const stockItems = (itemDto.stockCodes ?? []).map((code) =>
          manager.create(StockItem, {
            imei: code.imei.trim(),
            barcode: code.barcode?.trim(),
            entryDate: dto.purchaseDate,
            costAmount: toMoney(toNumber(itemDto.unitCost)),
            costCurrency: dto.currency,
            status: StockStatus.AVAILABLE,
            product,
            supplier,
            purchaseItem,
          }),
        );
        if (stockItems.length) {
          await manager.save(stockItems);
        }
      }

      const createdPurchase = await manager.findOne(Purchase, {
        where: { id: purchase.id },
        relations: { supplier: true, items: { product: true, stockItems: true } },
      });
      if (!createdPurchase) {
        throw new NotFoundException('Compra no encontrada');
      }

      return createdPurchase;
    });
  }

  async update(id: string, dto: UpdatePurchaseDto) {
    return this.dataSource.transaction(async (manager) => {
      const purchase = await manager.findOne(Purchase, {
        where: { id },
        relations: { supplier: true, items: { product: true, stockItems: true } },
      });
      if (!purchase) {
        throw new NotFoundException('Compra no encontrada');
      }

      if (dto.supplierId) {
        const supplier = await manager.findOne(Supplier, { where: { id: dto.supplierId } });
        if (!supplier) {
          throw new NotFoundException('Proveedor no encontrado');
        }
        purchase.supplier = supplier;
      }

      if (dto.purchaseDate) purchase.purchaseDate = dto.purchaseDate;
      if (dto.currency) purchase.currency = dto.currency;
      if (dto.notes !== undefined) purchase.notes = dto.notes;

      const itemDto = dto.items?.[0];
      if (itemDto) {
        if (itemDto.quantity !== undefined && itemDto.quantity <= 0) {
          throw new BadRequestException('La cantidad debe ser mayor a 0');
        }
        if (itemDto.unitCost !== undefined && toNumber(itemDto.unitCost) <= 0) {
          throw new BadRequestException('El costo unitario debe ser mayor a 0');
        }

        let purchaseItem = purchase.items[0];
        if (!purchaseItem) {
          purchaseItem = manager.create(PurchaseItem, { purchase, quantity: 1, unitCost: '0', subtotalAmount: '0' });
        }

        const stockedCount = purchaseItem.stockItems?.length ?? 0;
        const nextQuantity = itemDto.quantity ?? purchaseItem.quantity;
        if (nextQuantity < stockedCount) {
          throw new BadRequestException('La cantidad no puede ser menor al stock ya cargado');
        }

        if (itemDto.productId || itemDto.productName) {
          purchaseItem.product = await this.resolveProduct(manager, itemDto.productId, itemDto.productName);
        }
        purchaseItem.quantity = nextQuantity;
        purchaseItem.unitCost = toMoney(toNumber(itemDto.unitCost ?? purchaseItem.unitCost));
        purchaseItem.subtotalAmount = toMoney(purchaseItem.quantity * toNumber(purchaseItem.unitCost));
        await manager.save(purchaseItem);
      }

      const items = await manager.find(PurchaseItem, {
        where: { purchase: { id: purchase.id } },
        relations: { stockItems: true, product: true },
      });
      const total = items.reduce((sum, item) => sum + toNumber(item.subtotalAmount), 0);
      const paid = dto.paidAmount !== undefined ? toNumber(dto.paidAmount) : toNumber(purchase.paidAmount);
      if (paid < 0) {
        throw new BadRequestException('El pagado no puede ser menor a 0');
      }

      purchase.totalAmount = toMoney(total);
      purchase.paidAmount = toMoney(paid);
      purchase.balanceAmount = toMoney(Math.max(total - paid, 0));
      purchase.status = resolvePaymentStatus(total, paid);
      await manager.save(purchase);

      const updatedPurchase = await manager.findOne(Purchase, {
        where: { id: purchase.id },
        relations: { supplier: true, items: { product: true, stockItems: true } },
      });
      if (!updatedPurchase) {
        throw new NotFoundException('Compra no encontrada');
      }

      return updatedPurchase;
    });
  }

  private async resolveProduct(manager: EntityManager, id?: string, name?: string) {
    if (id) {
      const product = await manager.findOne(Product, { where: { id } });
      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }

      return product;
    }

    const normalizedName = name?.trim();
    if (!normalizedName) {
      throw new BadRequestException('El nombre del producto es obligatorio');
    }

    const existingProduct = await manager.findOne(Product, { where: { name: ILike(normalizedName) } });
    if (existingProduct) {
      return existingProduct;
    }

    const product = manager.create(Product, {
      name: normalizedName,
      isActive: true,
    });

    return manager.save(product);
  }
}
