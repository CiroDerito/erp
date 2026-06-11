import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumberString, IsOptional, IsString, IsUUID } from 'class-validator';
import { Currency } from '../../common/enums/currency.enum';
import { PaymentMethod } from '../../common/enums/payment-method.enum';

export class CreatePaymentDto {
  @ApiPropertyOptional({ example: '7f3d8f86-8e88-4f29-a8f4-1195f2d8b464' })
  @IsOptional()
  @IsUUID()
  wholesalerId?: string;

  @ApiPropertyOptional({ example: '7f3d8f86-8e88-4f29-a8f4-1195f2d8b464' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({ example: '7f3d8f86-8e88-4f29-a8f4-1195f2d8b465' })
  @IsOptional()
  @IsUUID()
  saleId?: string;

  @ApiPropertyOptional({ example: '7f3d8f86-8e88-4f29-a8f4-1195f2d8b465' })
  @IsOptional()
  @IsUUID()
  purchaseId?: string;

  @ApiProperty({ example: '2026-05-28' })
  @IsDateString()
  paymentDate: string;

  @ApiProperty({ example: '200000.00' })
  @IsNumberString()
  amount: string;

  @ApiProperty({ enum: Currency, example: Currency.ARS })
  @IsEnum(Currency)
  currency: Currency;

  @ApiPropertyOptional({ example: '1250.00' })
  @IsOptional()
  @IsNumberString()
  usdRateArs?: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.TRANSFER })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional({ example: 'Pago parcial acordado' })
  @IsOptional()
  @IsString()
  observations?: string;
}
