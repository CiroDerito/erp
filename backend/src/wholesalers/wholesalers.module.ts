import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wholesaler } from '../entities';
import { WholesalersController } from './wholesalers.controller';
import { WholesalersService } from './wholesalers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Wholesaler])],
  controllers: [WholesalersController],
  providers: [WholesalersService],
  exports: [WholesalersService],
})
export class WholesalersModule {}
