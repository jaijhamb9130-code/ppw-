import { NestFactory } from '@nestjs/core';
import * as crypto from 'crypto';
import { json, urlencoded } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import * as express from 'express';

// Polyfill for Node.js 18/20 where 'crypto' is not globally available for TypeORM
if (!global.crypto) {
  (global as any).crypto = crypto;
}

import { AppModule } from './app.module';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    app.use(json({ limit: '50mb' }));
    app.use(urlencoded({ extended: true, limit: '50mb' }));
    app.setGlobalPrefix('api');
    app.enableCors({
      origin: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });

    // Serve frontend static files (JS, CSS, images) with correct MIME types
    const clientDir = join(process.cwd(), 'client');
    if (existsSync(clientDir)) {
      app.use(express.static(clientDir));
    }

    const port = process.env.PORT ?? 3000;
    await app.listen(port, '0.0.0.0');

    // SPA fallback: AFTER everything is initialized
    // Serve index.html for non-API, non-file routes (React Router handles them)
    const clientIndex = join(clientDir, 'index.html');
    if (existsSync(clientIndex)) {
      const expressApp = app.getHttpAdapter().getInstance();
      expressApp.use((req, res, next) => {
        if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.includes('.')) {
          return res.sendFile(clientIndex);
        }
        next();
      });
    }

    console.log(`Application is running on: http://localhost:${port}`);
    console.log(`Global Prefix: api`);
  } catch (err) {
    console.error('SERVER FAILED TO START:', err);
    process.exit(1);
  }
}
bootstrap();
