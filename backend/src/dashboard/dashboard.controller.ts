import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @ApiOperation({ summary: 'Obtener resumen general del dashboard' })
  @Get()
  getSummary(@Query('month') month?: string) {
    return this.dashboardService.getSummary(month);
  }
}
