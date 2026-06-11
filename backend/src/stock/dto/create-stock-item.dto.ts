import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumberString, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { Currency } from '../../common/enums/currency.enum';
import { StockStatus } from '../../common/enums/stock-status.enum';

export class CreateStockItemDto {
  @ApiProperty({ example: '356812345678901' })
  @IsString()
  @MinLength(5)
  imei: string;

  @ApiPropertyOptional({ example: '356812345678901' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ example: '7f3d8f86-8e88-4f29-a8f4-1195f2d8b461' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ example: '7f3d8f86-8e88-4f29-a8f4-1195f2d8b466' })
  @IsOptional()
  @IsUUID()
  purchaseItemId?: string;

  @ApiPropertyOptional({ example: 'Samsung A15 128GB' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  productName?: string;

  @ApiPropertyOptional({ example: '7f3d8f86-8e88-4f29-a8f4-1195f2d8b462' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiProperty({ example: '2026-05-28' })
  @IsDateString()
  entryDate: string;

  @ApiProperty({ example: '250000.00' })
  @IsNumberString()
  costAmount: string;

  @ApiProperty({ enum: Currency, example: Currency.ARS })
  @IsEnum(Currency)
  costCurrency: Currency;

  @ApiPropertyOptional({ enum: StockStatus, example: StockStatus.AVAILABLE })
  @IsOptional()
  @IsEnum(StockStatus)
  status?: StockStatus;
}
