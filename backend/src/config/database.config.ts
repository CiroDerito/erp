import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { entities } from '../entities';

export const databaseConfig: TypeOrmModuleAsyncOptions = {
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const useSsl = config.get<string>('DATABASE_SSL', 'true') === 'true';
    const databaseUrl = config.get<string>('DATABASE_URL');

    const baseConfig = {
      type: 'postgres',
      entities,
      synchronize: config.get<string>('NODE_ENV') !== 'production',
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    } as const;

    if (databaseUrl) {
      return {
        ...baseConfig,
        url: databaseUrl,
      };
    }

    return {
      ...baseConfig,
      host: config.getOrThrow<string>('DATABASE_HOST'),
      port: config.get<number>('DATABASE_PORT', 5432),
      username: config.getOrThrow<string>('DATABASE_USER'),
      password: config.getOrThrow<string>('DATABASE_PASSWORD'),
      database: config.getOrThrow<string>('DATABASE_NAME'),
    };
  },
};
