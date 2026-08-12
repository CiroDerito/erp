import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumberString, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { Currency } from '../../common/enums/currency.enum';
import { StockStatus } from '../../common/enums/stock-status.enum';

export class CreateStockItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(5)
  imei: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  purchaseItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  productName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiProperty()
  @IsDateString()
  entryDate: string;

  @ApiProperty()
  @IsNumberString()
  costAmount: string;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  costCurrency: Currency;

  @ApiPropertyOptional({ enum: StockStatus })
  @IsOptional()
  @IsEnum(StockStatus)
  status?: StockStatus;
}
