import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment, Sale, Wholesaler } from '../entities';
import { WholesalersController } from './wholesalers.controller';
import { WholesalersService } from './wholesalers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Wholesaler, Sale, Payment])],
  controllers: [WholesalersController],
  providers: [WholesalersService],
  exports: [WholesalersService],
})
export class WholesalersModule {}
