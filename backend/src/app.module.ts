import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { databaseConfig } from './config/database.config';
import { DashboardModule } from './dashboard/dashboard.module';
import { entities } from './entities';
import { PaymentsModule } from './payments/payments.module';
import { ProductsModule } from './products/products.module';
import { PurchasesModule } from './purchases/purchases.module';
import { SalesModule } from './sales/sales.module';
import { SeedModule } from './seed/seed.module';
import { StockModule } from './stock/stock.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { UsersModule } from './users/users.module';
import { WholesalersModule } from './wholesalers/wholesalers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync(databaseConfig),
    TypeOrmModule.forFeature(entities),
    UsersModule,
    AuthModule,
    WholesalersModule,
    SuppliersModule,
    ProductsModule,
    StockModule,
    PurchasesModule,
    SalesModule,
    PaymentsModule,
    DashboardModule,
    SeedModule,
  ],
})
export class AppModule {}
