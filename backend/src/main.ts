import { NestFactory } from '@nestjs/core';
import * as crypto from 'crypto';
import { json, urlencoded } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import * as express from 'express';
import { SpaFilter } from './spa.filter';

// Polyfill for Node.js 18/20 where 'crypto' is not globally available for TypeORM
if (!global.crypto) {
  (global as any).crypto = crypto;
}

import { AppModule } from './app.module';
import { DataSource } from 'typeorm';

// One-time role-defaults backfill for users whose `permissions` is NULL
// (never been set). Idempotent: only NULL rows are touched, so re-running
// on every boot is a no-op once admins have curated their staff. Admin
// users are NEVER touched (they bypass PermissionsGuard anyway). Rows
// admin explicitly set to '[]' are also left alone — that's a deliberate
// "no permissions" choice we must respect.
async function backfillUserPermissions(app: any) {
  const ds = app.get(DataSource);
  const roleDefaults: Record<string, string[]> = {
    manager: ['inventory'],
    employee: ['orders', 'reports'],
  };
  for (const [role, perms] of Object.entries(roleDefaults)) {
    try {
      const json = JSON.stringify(perms);
      const r: any = await ds.query(
        `UPDATE \`user\` SET permissions = ?
         WHERE role = ? AND permissions IS NULL`,
        [json, role],
      );
      const affected = r?.affectedRows ?? r?.[1]?.affectedRows ?? 0;
      if (affected > 0) {
        console.log(`Migration: backfilled ${affected} ${role}(s) with default permissions ${json}`);
      }
    } catch (e: any) {
      console.error(`Migration: ${role} permissions backfill failed:`, e?.sqlMessage || e?.message);
    }
  }
}

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    await backfillUserPermissions(app);
    const expressInstance = app.getHttpAdapter().getInstance();
    expressInstance.set('trust proxy', 1);
    app.use(json({ limit: '50mb' }));
    app.use(urlencoded({ extended: true, limit: '50mb' }));
    app.setGlobalPrefix('api');
    app.enableCors({
      origin: [
        'https://onlineppw.com',
        'https://www.onlineppw.com',
        'http://abspw.ap-south-1.elasticbeanstalk.com',
        'https://abspw.ap-south-1.elasticbeanstalk.com',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5180',
      ],
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });

    // Serve frontend static files (JS, CSS, images) with correct MIME types
    const clientDir = join(process.cwd(), 'client');
    if (existsSync(clientDir)) {
      app.use(express.static(clientDir));
    }

    // SPA fallback: catches 404s for non-API routes and serves index.html
    app.useGlobalFilters(new SpaFilter());

    const port = process.env.PORT ?? 3000;
    await app.listen(port, '0.0.0.0');
    console.log(`Application is running on: http://localhost:${port}`);
    console.log(`Global Prefix: api`);
  } catch (err) {
    console.error('SERVER FAILED TO START:', err);
    process.exit(1);
  }
}
bootstrap();
