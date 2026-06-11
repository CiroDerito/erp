import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateWholesalerDto } from './dto/create-wholesaler.dto';
import { UpdateWholesalerDto } from './dto/update-wholesaler.dto';
import { WholesalersService } from './wholesalers.service';

@ApiTags('Mayoristas')
@Controller('wholesalers')
export class WholesalersController {
  constructor(private readonly wholesalersService: WholesalersService) {}

  @ApiOperation({ summary: 'Listar mayoristas' })
  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.wholesalersService.findAll(query);
  }

  @ApiOperation({ summary: 'Obtener mayorista por id' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.wholesalersService.findOne(id);
  }

  @ApiOperation({ summary: 'Crear mayorista' })
  @Post()
  create(@Body() dto: CreateWholesalerDto) {
    return this.wholesalersService.create(dto);
  }

  @ApiOperation({ summary: 'Actualizar mayorista' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWholesalerDto) {
    return this.wholesalersService.update(id, dto);
  }

  @ApiOperation({ summary: 'Eliminar mayorista' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.wholesalersService.remove(id);
  }
}
