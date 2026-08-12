import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { Product, PurchaseItem, StockItem, Supplier } from '../entities';
import { CreateStockItemDto } from './dto/create-stock-item.dto';
import { StockQueryDto } from './dto/stock-query.dto';
import { UpdateStockItemDto } from './dto/update-stock-item.dto';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(StockItem)
    private readonly stockRepository: Repository<StockItem>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>,
    @InjectRepository(PurchaseItem)
    private readonly purchaseItemsRepository: Repository<PurchaseItem>,
  ) {}

  async findAll(query: StockQueryDto) {
    const where: FindOptionsWhere<StockItem>[] = [];
    const baseWhere: FindOptionsWhere<StockItem> = {};

    if (query.status) {
      baseWhere.status = query.status;
    }

    if (query.productId) {
      baseWhere.product = { id: query.productId };
    }

    if (query.supplierId) {
      baseWhere.supplier = { id: query.supplierId };
    }

    if (query.search) {
      where.push(
        { ...baseWhere, imei: ILike(`%${query.search}%`) },
        { ...baseWhere, barcode: ILike(`%${query.search}%`) },
        { ...baseWhere, product: { name: ILike(`%${query.search}%`) } },
      );
    }

    const [data, total] = await this.stockRepository.findAndCount({
      where: where.length ? where : baseWhere,
      relations: { product: true, supplier: true, purchaseItem: { product: true, purchase: { supplier: true } }, saleItem: { sale: { wholesaler: true } } },
      order: { entryDate: 'DESC', createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return { data, total, page: query.page, limit: query.limit };
  }

  async findOne(id: string) {
    const stockItem = await this.stockRepository.findOne({
      where: { id },
      relations: { product: true, supplier: true, purchaseItem: { product: true, purchase: { supplier: true } }, saleItem: { sale: { wholesaler: true } } },
    });

    if (!stockItem) {
      throw new NotFoundException('Stock item not found');
    }

    return stockItem;
  }

  async create(dto: CreateStockItemDto) {
    await this.ensureUniqueCodes(dto.imei, dto.barcode);
    const purchaseItem = dto.purchaseItemId ? await this.findPurchaseItemWithPending(dto.purchaseItemId) : null;
    const product = purchaseItem?.product ?? await this.resolveProduct(dto.productId, dto.productName);
    const supplier = purchaseItem?.purchase.supplier ?? (dto.supplierId ? await this.findSupplier(dto.supplierId) : null);

    const stockItem = this.stockRepository.create({
      imei: dto.imei.trim(),
      barcode: dto.barcode?.trim(),
      entryDate: dto.entryDate,
      costAmount: dto.costAmount,
      costCurrency: dto.costCurrency,
      status: dto.status,
      product,
      supplier,
      purchaseItem,
    });

    return this.stockRepository.save(stockItem);
  }

  async update(id: string, dto: UpdateStockItemDto) {
    const stockItem = await this.findOne(id);

    if (dto.imei || dto.barcode) {
      await this.ensureUniqueCodes(dto.imei ?? stockItem.imei, dto.barcode ?? stockItem.barcode, id);
    }

    if (dto.productId) {
      stockItem.product = await this.findProduct(dto.productId);
    }

    if (dto.purchaseItemId && dto.purchaseItemId !== stockItem.purchaseItem?.id) {
      const purchaseItem = await this.findPurchaseItemWithPending(dto.purchaseItemId);
      stockItem.purchaseItem = purchaseItem;
      stockItem.product = purchaseItem.product;
      stockItem.supplier = purchaseItem.purchase.supplier;
    }

    if (dto.supplierId !== undefined) {
      stockItem.supplier = dto.supplierId ? await this.findSupplier(dto.supplierId) : null;
    }

    Object.assign(stockItem, {
      imei: dto.imei?.trim() ?? stockItem.imei,
      barcode: dto.barcode?.trim() ?? stockItem.barcode,
      entryDate: dto.entryDate ?? stockItem.entryDate,
      costAmount: dto.costAmount ?? stockItem.costAmount,
      costCurrency: dto.costCurrency ?? stockItem.costCurrency,
      status: dto.status ?? stockItem.status,
    });

    return this.stockRepository.save(stockItem);
  }

  async remove(id: string) {
    const stockItem = await this.findOne(id);
    await this.stockRepository.softRemove(stockItem);
    return { id };
  }

  private async resolveProduct(id?: string, name?: string) {
    if (id) {
      return this.findProduct(id);
    }

    const normalizedName = name?.trim();
    if (!normalizedName) {
      throw new NotFoundException('Product name is required');
    }

    const existingProduct = await this.productsRepository.findOne({
      where: { name: ILike(normalizedName) },
    });
    if (existingProduct) {
      return existingProduct;
    }

    const product = this.productsRepository.create({
      name: normalizedName,
      isActive: true,
    });

    return this.productsRepository.save(product);
  }

  private async findProduct(id: string) {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private async findSupplier(id: string) {
    const supplier = await this.suppliersRepository.findOne({ where: { id } });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  private async findPurchaseItemWithPending(id: string) {
    const purchaseItem = await this.purchaseItemsRepository.findOne({
      where: { id },
      relations: { product: true, stockItems: true, purchase: { supplier: true } },
    });
    if (!purchaseItem) {
      throw new NotFoundException('Item de compra no encontrado');
    }

    const stockedCount = purchaseItem.stockItems?.length ?? 0;
    if (purchaseItem.quantity - stockedCount <= 0) {
      throw new BadRequestException('No queda cantidad por stockear para este producto');
    }

    return purchaseItem;
  }

  private async ensureUniqueCodes(imei: string, barcode?: string | null, currentId?: string) {
    const existingByImei = await this.stockRepository.findOne({ where: { imei: imei.trim() } });
    if (existingByImei && existingByImei.id !== currentId) {
      throw new ConflictException('IMEI already exists');
    }

    if (!barcode) {
      return;
    }

    const existingByBarcode = await this.stockRepository.findOne({
      where: { barcode: barcode.trim() },
    });
    if (existingByBarcode && existingByBarcode.id !== currentId) {
      throw new ConflictException('Barcode already exists');
    }
  }
}
