import { NestFactory } from '@nestjs/core';
import * as crypto from 'crypto';
import { json, urlencoded } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';

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
      origin: true, // Allow all origins for production simplicity unless strict security requested
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });
    // SPA fallback: serve index.html for non-API routes
    const clientPath = join(process.cwd(), 'client', 'index.html');
    if (existsSync(clientPath)) {
      const expressApp = app.getHttpAdapter().getInstance();
      expressApp.get(/^\/(?!api|auth|public)[^.]*$/, (req, res, next) => {
        res.sendFile(clientPath);
      });
    }

    const port = process.env.PORT ?? 3000;
    // Bind to 0.0.0.0 to ensure availability on all interfaces
    await app.listen(port, '0.0.0.0');
    console.log(`Application is running on: http://localhost:${port}`);
    console.log(`Global Prefix: api`);
  } catch (err) {
    console.error('SERVER FAILED TO START:', err);
    process.exit(1);
  }
}
bootstrap();
