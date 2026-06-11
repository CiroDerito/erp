import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { DataSource, EntityManager } from 'typeorm';
import { Currency } from '../common/enums/currency.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { StockStatus } from '../common/enums/stock-status.enum';
import { toMoney } from '../common/utils/money';
import {
  Product,
  Purchase,
  PurchaseItem,
  Sale,
  SaleItem,
  StockItem,
  Supplier,
  User,
  Wholesaler,
} from '../entities';

@Injectable()
export class SeedService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async runInitialSeed() {
    return this.dataSource.transaction(async (manager) => {
      const admin = await this.ensureAdmin(manager);
      const suppliers = await this.ensureSuppliers(manager);
      const wholesalers = await this.ensureWholesalers(manager);
      const products = await this.ensureProducts(manager);
      const purchase = await this.ensureDemoPurchase(manager, suppliers, products, admin);
      const sale = await this.ensureDemoSale(manager, wholesalers[0], admin);

      return {
        admin: { id: admin.id, email: admin.email },
        suppliers: suppliers.length,
        wholesalers: wholesalers.length,
        products: products.length,
        stockItems: await manager.count(StockItem),
        purchaseId: purchase.id,
        saleId: sale.id,
      };
    });
  }

  private async ensureAdmin(manager: EntityManager) {
    const existing = await manager.findOne(User, { where: {}, order: { createdAt: 'ASC' } });
    if (existing) {
      return existing;
    }

    return manager.save(
      manager.create(User, {
        name: this.config.get<string>('ADMIN_NAME', 'Admin'),
        email: this.config.get<string>('ADMIN_EMAIL', 'admin@erp.local').toLowerCase(),
        passwordHash: await bcrypt.hash(this.config.get<string>('ADMIN_PASSWORD', 'admin12345'), 12),
        isActive: true,
      }),
    );
  }

  private async ensureSuppliers(manager: EntityManager) {
    const rows = [
      { name: 'Importadora Celular', email: 'ventas@importadoracelular.demo', phone: '+54 11 4000-1000' },
      { name: 'Mayorista Norte', email: 'contacto@mayoristanorte.demo', phone: '+54 11 4000-2000' },
      { name: 'Accesorios Chile', email: 'ventas@accesorioschile.demo', phone: '+56 2 5555-3000' },
    ];

    return Promise.all(rows.map((row) => this.findOrCreateByName(manager, Supplier, row)));
  }

  private async ensureWholesalers(manager: EntityManager) {
    const rows = [
      { name: 'Tech Store', email: 'compras@techstore.demo', phone: '+54 11 5000-1000' },
      { name: 'Distribuidora Norte', email: 'admin@distribuidoranorte.demo', phone: '+54 11 5000-2000' },
      { name: 'Maria Gomez', email: 'maria.gomez@demo.local', phone: '+54 11 5000-3000' },
    ];

    return Promise.all(rows.map((row) => this.findOrCreateByName(manager, Wholesaler, row)));
  }

  private async ensureProducts(manager: EntityManager) {
    const rows = [
      { name: 'Samsung A15 128GB', brand: 'Samsung', model: 'A15 128GB' },
      { name: 'Redmi Note 12', brand: 'Xiaomi', model: 'Note 12' },
      { name: 'iPhone 13 128GB', brand: 'Apple', model: 'iPhone 13 128GB' },
      { name: 'Vidrio templado', brand: 'Generico', model: 'Universal' },
    ];

    return Promise.all(rows.map((row) => this.findOrCreateByName(manager, Product, row)));
  }

  private async ensureDemoPurchase(
    manager: EntityManager,
    suppliers: Supplier[],
    products: Product[],
    admin: User,
  ) {
    const existing = await manager.findOne(Purchase, {
      where: { notes: 'seed: compra inicial demo' },
    });
    if (existing) {
      return existing;
    }

    const supplier = suppliers[0];
    const purchase = await manager.save(
      manager.create(Purchase, {
        supplier,
        createdBy: admin,
        purchaseDate: this.today(),
        totalAmount: '930000.00',
        paidAmount: '930000.00',
        balanceAmount: '0.00',
        currency: Currency.ARS,
        status: PaymentStatus.PAID,
        notes: 'seed: compra inicial demo',
      }),
    );

    const purchaseItems = [
      {
        product: products[0],
        quantity: 2,
        unitCost: 250000,
        imeis: ['356812345678901', '356812345678902'],
      },
      {
        product: products[1],
        quantity: 1,
        unitCost: 210000,
        imeis: ['867512340987654'],
      },
      {
        product: products[2],
        quantity: 1,
        unitCost: 220000,
        imeis: ['353409876543210'],
      },
    ];

    for (const item of purchaseItems) {
      const purchaseItem = await manager.save(
        manager.create(PurchaseItem, {
          purchase,
          product: item.product,
          quantity: item.quantity,
          unitCost: toMoney(item.unitCost),
          subtotalAmount: toMoney(item.quantity * item.unitCost),
        }),
      );

      for (const imei of item.imeis) {
        const existingStock = await manager.findOne(StockItem, { where: { imei } });
        if (existingStock) {
          continue;
        }

        await manager.save(
          manager.create(StockItem, {
            imei,
            barcode: imei,
            product: item.product,
            supplier,
            purchaseItem,
            entryDate: this.today(),
            costAmount: toMoney(item.unitCost),
            costCurrency: Currency.ARS,
            status: StockStatus.AVAILABLE,
          }),
        );
      }
    }

    return purchase;
  }

  private async ensureDemoSale(manager: EntityManager, wholesaler: Wholesaler, admin: User) {
    const existing = await manager.findOne(Sale, {
      where: { notes: 'seed: venta inicial demo' },
    });
    if (existing) {
      return existing;
    }

    const stockItem = await manager.findOne(StockItem, {
      where: { imei: '356812345678901' },
      relations: { product: true },
    });
    if (!stockItem) {
      throw new Error('Seed stock item was not created');
    }

    const sale = await manager.save(
      manager.create(Sale, {
        wholesaler,
        createdBy: admin,
        saleDate: this.today(),
        dueDate: this.addDays(7),
        subtotalAmount: '350000.00',
        discountAmount: '0.00',
        totalAmount: '350000.00',
        paidAmount: '150000.00',
        balanceAmount: '200000.00',
        currency: Currency.ARS,
        status: PaymentStatus.PARTIAL,
        notes: 'seed: venta inicial demo',
      }),
    );

    await manager.save(
      manager.create(SaleItem, {
        sale,
        product: stockItem.product,
        stockItem,
        quantity: 1,
        unitPrice: '350000.00',
        subtotalAmount: '350000.00',
        isExternalProduct: false,
      }),
    );

    stockItem.status = StockStatus.SOLD;
    await manager.save(stockItem);

    return sale;
  }

  private async findOrCreateByName<T extends { name: string }>(
    manager: EntityManager,
    entity: { new (): T },
    data: Partial<T> & { name: string },
  ) {
    const existing = await manager.findOne(entity, { where: { name: data.name } as never });
    if (existing) {
      return existing;
    }

    return manager.save(manager.create(entity, data as never));
  }

  private today() {
    return new Date().toISOString().slice(0, 10);
  }

  private addDays(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }
}
