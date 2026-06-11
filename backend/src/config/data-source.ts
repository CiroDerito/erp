import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { entities } from '../entities';

config();

const useSsl = process.env.DATABASE_SSL !== 'false';
const databaseUrl = process.env.DATABASE_URL;

export default new DataSource({
  type: 'postgres',
  ...(databaseUrl
    ? { url: databaseUrl }
    : {
        host: process.env.DATABASE_HOST,
        port: Number(process.env.DATABASE_PORT ?? 5432),
        username: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
      }),
  entities,
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});
