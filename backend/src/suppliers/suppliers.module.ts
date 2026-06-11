import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from '../entities';
import { ProveedoresController } from './proveedores.controller';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier])],
  controllers: [SuppliersController, ProveedoresController],
  providers: [SuppliersService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
