import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Currency } from '../../common/enums/currency.enum';

export class CreateSaleItemDto {
  @ApiPropertyOptional({ example: '7f3d8f86-8e88-4f29-a8f4-1195f2d8b463' })
  @IsOptional()
  @IsUUID()
  stockItemId?: string;

  @ApiPropertyOptional({ example: '356812345678901' })
  @IsOptional()
  @IsString()
  stockItemImei?: string;

  @ApiPropertyOptional({ example: '7f3d8f86-8e88-4f29-a8f4-1195f2d8b461' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ example: 'Producto externo' })
  @IsOptional()
  @IsString()
  externalProductName?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isExternalProduct?: boolean;

  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @Min(1)
  quantity: number;

  @ApiProperty({ example: '350000.00' })
  @IsNumberString()
  unitPrice: string;
}

export class CreateSaleDto {
  @ApiProperty({ example: '7f3d8f86-8e88-4f29-a8f4-1195f2d8b464' })
  @IsUUID()
  wholesalerId: string;

  @ApiProperty({ example: '2026-05-28' })
  @IsDateString()
  saleDate: string;

  @ApiPropertyOptional({ example: '2026-06-04' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ enum: Currency, example: Currency.ARS })
  @IsEnum(Currency)
  currency: Currency;

  @ApiPropertyOptional({ example: '150000.00' })
  @IsOptional()
  @IsNumberString()
  paidAmount?: string;

  @ApiPropertyOptional({ example: '0.00' })
  @IsOptional()
  @IsNumberString()
  discountAmount?: string;

  @ApiPropertyOptional({ example: 'Venta parcial' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateSaleItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];
}
