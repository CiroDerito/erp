import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumberString, IsOptional, IsString, IsUUID } from 'class-validator';
import { Currency } from '../../common/enums/currency.enum';

export class UpdateSaleDto {
  @ApiPropertyOptional({ example: '7f3d8f86-8e88-4f29-a8f4-1195f2d8b464' })
  @IsOptional()
  @IsUUID()
  wholesalerId?: string;

  @ApiPropertyOptional({ example: '2026-05-28' })
  @IsOptional()
  @IsDateString()
  saleDate?: string;

  @ApiPropertyOptional({ example: '2026-06-04' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ enum: Currency, example: Currency.ARS })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({ example: '150000.00' })
  @IsOptional()
  @IsNumberString()
  paidAmount?: string;

  @ApiPropertyOptional({ example: 'Venta parcial' })
  @IsOptional()
  @IsString()
  notes?: string;
}
