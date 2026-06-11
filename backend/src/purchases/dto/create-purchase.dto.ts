import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Currency } from '../../common/enums/currency.enum';

export class CreatePurchaseStockCodeDto {
  @ApiProperty({ example: '356812345678901' })
  @IsString()
  imei: string;

  @ApiPropertyOptional({ example: '356812345678901' })
  @IsOptional()
  @IsString()
  barcode?: string;
}

export class CreatePurchaseItemDto {
  @ApiPropertyOptional({ example: '7f3d8f86-8e88-4f29-a8f4-1195f2d8b461' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ example: 'iPhone 13 128GB' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  productName?: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @Type(() => Number)
  @Min(1)
  quantity: number;

  @ApiProperty({ example: '250000.00' })
  @IsNumberString()
  unitCost: string;

  @ApiPropertyOptional({ type: [CreatePurchaseStockCodeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseStockCodeDto)
  stockCodes?: CreatePurchaseStockCodeDto[];
}

export class CreatePurchaseDto {
  @ApiProperty({ example: '7f3d8f86-8e88-4f29-a8f4-1195f2d8b462' })
  @IsUUID()
  supplierId: string;

  @ApiProperty({ example: '2026-05-28' })
  @IsDateString()
  purchaseDate: string;

  @ApiProperty({ enum: Currency, example: Currency.ARS })
  @IsEnum(Currency)
  currency: Currency;

  @ApiPropertyOptional({ example: '500000.00' })
  @IsOptional()
  @IsNumberString()
  paidAmount?: string;

  @ApiPropertyOptional({ example: 'Compra inicial de equipos' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreatePurchaseItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseItemDto)
  items: CreatePurchaseItemDto[];
}
