import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumberString, IsOptional, IsString, IsUUID } from 'class-validator';
import { Currency } from '../../common/enums/currency.enum';
import { PaymentMethod } from '../../common/enums/payment-method.enum';

export class CreatePaymentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  wholesalerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  saleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  purchaseId?: string;

  @ApiProperty()
  @IsDateString()
  paymentDate: string;

  @ApiProperty()
  @IsNumberString()
  amount: string;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency: Currency;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  usdRateArs?: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;
}
