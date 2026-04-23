import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import helmet from 'helmet'
import compression = require('compression')
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './shared/filters/http-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  })

  // Seguridad y compresión
  app.use(helmet())
  app.use(compression())

  // CORS — solo acepta el frontend declarado en FRONTEND_URL
  app.enableCors({
    origin: process.env['FRONTEND_URL'] ?? 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  // Validación global: rechaza campos extra, transforma tipos automáticamente
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  // Filtro global: mapea AppError del dominio a códigos HTTP correctos
  app.useGlobalFilters(new HttpExceptionFilter())

  // Swagger solo en desarrollo
  if (process.env['NODE_ENV'] !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('H2R API')
      .setDescription('E-commerce de repuestos para motos — API REST')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api/docs', app, document)
    Logger.log('Swagger disponible en /api/docs', 'Bootstrap')
  }

  const port = process.env['PORT'] ?? 3001
  await app.listen(port)
  Logger.log(`API corriendo en http://localhost:${port}`, 'Bootstrap')
}

bootstrap()
