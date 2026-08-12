import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminUserResponse } from './dto/admin-user.response';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { UsersService } from './users.service';
import {CreateAdminUserDto} from './dto/create-user-dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Obtener usuario admin unico' })
  @Get('admin')
  async getAdmin() {
    return new AdminUserResponse(await this.usersService.findAdminOrFail());
  }

  @ApiOperation({ summary: 'Actualizar usuario admin unico' })
  @Patch('admin')
  async updateAdmin(@Body() dto: UpdateAdminUserDto) {
    return new AdminUserResponse(await this.usersService.updateAdmin(dto));
  }

  @ApiOperation({ summary: 'Crear nuevo usuario' })
  @Post('create')
  async create(@Body() dto: CreateAdminUserDto) {
    return new AdminUserResponse(await this.usersService.createAdmin(dto));
  }
}
