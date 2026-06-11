import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { StockStatus } from '../../common/enums/stock-status.enum';

export class StockQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: StockStatus })
  @IsOptional()
  @IsEnum(StockStatus)
  status?: StockStatus;

  @ApiPropertyOptional({ example: '7f3d8f86-8e88-4f29-a8f4-1195f2d8b461' })
  @IsOptional()
  @IsString()
  productId?: string;
}
