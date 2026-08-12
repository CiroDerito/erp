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
  @ApiProperty()
  @IsString()
  imei: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string;
}

export class CreatePurchaseItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  productName?: string;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @Min(1)
  quantity: number;

  @ApiProperty()
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
  @ApiProperty()
  @IsUUID()
  supplierId: string;

  @ApiProperty()
  @IsDateString()
  purchaseDate: string;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency: Currency;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  paidAmount?: string;

  @ApiPropertyOptional()
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
