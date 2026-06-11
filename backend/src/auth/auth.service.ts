import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../entities';
import { UsersService } from '../users/users.service';
import { AuthUserResponse } from './dto/auth-user.response';
import { LoginDto } from './dto/login.dto';
import { LoginResponse } from './dto/login.response';

type TokenPayload = {
  sub: string;
  email: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.validateCredentials(dto.email, dto.password);
    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN', '1d');
    const accessToken = await this.jwtService.signAsync(this.buildPayload(user));

    return new LoginResponse({
      accessToken,
      expiresIn,
      user: new AuthUserResponse(user),
    });
  }

  async getSession(authHeader?: string) {
    const token = this.extractBearerToken(authHeader);
    const payload = await this.verifyToken(token);
    const user = await this.usersService.findByEmail(payload.email);

    if (!user || !user.isActive || user.id !== payload.sub) {
      throw new UnauthorizedException('Invalid session');
    }

    return { user: new AuthUserResponse(user) };
  }

  private async validateCredentials(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  private buildPayload(user: User): TokenPayload {
    return {
      sub: user.id,
      email: user.email,
    };
  }

  private extractBearerToken(authHeader?: string) {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    return authHeader.slice('Bearer '.length).trim();
  }

  private async verifyToken(token: string) {
    try {
      return await this.jwtService.verifyAsync<TokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid session');
    }
  }
}
