import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

/** Limite do body (fotos em base64 no PATCH /users/:id/profile). Express default ~100kb. */
const BODY_LIMIT = process.env.REQUEST_BODY_LIMIT ?? '12mb';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: BODY_LIMIT }));
  app.use(urlencoded({ limit: BODY_LIMIT, extended: true }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({ origin: true });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
