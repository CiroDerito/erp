import { Payment } from './payment.entity';
import { Product } from './product.entity';
import { PurchaseItem } from './purchase-item.entity';
import { Purchase } from './purchase.entity';
import { SaleItem } from './sale-item.entity';
import { Sale } from './sale.entity';
import { StockItem } from './stock-item.entity';
import { Supplier } from './supplier.entity';
import { User } from './user.entity';
import { Wholesaler } from './wholesaler.entity';

export const entities = [
  User,
  Wholesaler,
  Supplier,
  Product,
  StockItem,
  Purchase,
  PurchaseItem,
  Sale,
  SaleItem,
  Payment,
];

export {
  Payment,
  Product,
  Purchase,
  PurchaseItem,
  Sale,
  SaleItem,
  StockItem,
  Supplier,
  User,
  Wholesaler,
};
