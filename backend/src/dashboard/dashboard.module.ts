import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Purchase, Sale } from '../entities';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, Purchase])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
