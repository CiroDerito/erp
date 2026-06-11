import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateStockItemDto } from './dto/create-stock-item.dto';
import { StockQueryDto } from './dto/stock-query.dto';
import { UpdateStockItemDto } from './dto/update-stock-item.dto';
import { StockService } from './stock.service';

@ApiTags('Stock')
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @ApiOperation({ summary: 'Listar stock por IMEI/codigo' })
  @Get()
  findAll(@Query() query: StockQueryDto) {
    return this.stockService.findAll(query);
  }

  @ApiOperation({ summary: 'Obtener item de stock por id' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stockService.findOne(id);
  }

  @ApiOperation({ summary: 'Crear item de stock manualmente' })
  @Post()
  create(@Body() dto: CreateStockItemDto) {
    return this.stockService.create(dto);
  }

  @ApiOperation({ summary: 'Actualizar item de stock' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStockItemDto) {
    return this.stockService.update(id, dto);
  }

  @ApiOperation({ summary: 'Eliminar item de stock' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.stockService.remove(id);
  }
}
