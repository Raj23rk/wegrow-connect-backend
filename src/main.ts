import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // =====================================================
  // SECURITY
  // =====================================================

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(compression());

  // =====================================================
  // CORS
  // =====================================================

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://wegrow-connect-frontend.vercel.app',
      'https://wegrow-connect-frontend-vhry.vercel.app',
    ],
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
    ],
    credentials: true,
  });

  // =====================================================
  // API PREFIX
  // =====================================================

  app.setGlobalPrefix('api/v1');

  // =====================================================
  // INTERCEPTORS & EXCEPTION FILTER
  // =====================================================

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // =====================================================
  // VALIDATION
  // =====================================================

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // =====================================================
  // SWAGGER
  // =====================================================

  const config = new DocumentBuilder()
    .setTitle('WeGrow Connect API')
    .setDescription('The WeGrow Connect REST API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/v1/docs', app, document);

  // =====================================================
  // SERVER
  // =====================================================

  const port = process.env.PORT || 4000;

  await app.listen(port, '0.0.0.0');

  console.log(
    `Application is running on: http://0.0.0.0:${port}/api/v1`,
  );
}

bootstrap();