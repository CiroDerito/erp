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
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  stockItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stockItemImei?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalProductName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isExternalProduct?: boolean;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @Min(1)
  quantity: number;

  @ApiProperty()
  @IsNumberString()
  unitPrice: string;
}

export class CreateSaleDto {
  @ApiProperty()
  @IsUUID()
  wholesalerId: string;

  @ApiProperty()
  @IsDateString()
  saleDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency: Currency;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  paidAmount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  discountAmount?: string;

  @ApiPropertyOptional()
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
