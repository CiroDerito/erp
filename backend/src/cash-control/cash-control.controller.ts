import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CashControlService } from './cash-control.service';

@ApiTags('Caja')
@Controller('cash-control')
export class CashControlController {
  constructor(private readonly cashControlService: CashControlService) {}
  @ApiOperation({ summary: 'Obtener cierre de caja y movimientos en efectivo del día' })
  @Get()
  getSummary(@Query('date') date?: string) { return this.cashControlService.getSummary(date); }
}
