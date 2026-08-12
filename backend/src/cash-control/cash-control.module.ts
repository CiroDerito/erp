import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment, Purchase, Sale, StockItem } from '../entities';
import { CashControlController } from './cash-control.controller';
import { CashControlService } from './cash-control.service';

@Module({ imports: [TypeOrmModule.forFeature([Payment, Sale, Purchase, StockItem])], controllers: [CashControlController], providers: [CashControlService] })
export class CashControlModule {}
