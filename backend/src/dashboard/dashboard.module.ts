import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Purchase, Sale, StockItem } from '../entities';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, Purchase, StockItem])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
