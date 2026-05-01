import 'reflect-metadata'
import 'dotenv/config'
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
  // En desarrollo, Swagger UI requiere scripts/estilos inline — relajamos CSP solo ahí
  app.use(
    helmet({
      contentSecurityPolicy: process.env['NODE_ENV'] === 'production' ? undefined : false,
    }),
  )
  app.use(compression())

  // CORS — acepta el frontend declarado en FRONTEND_URL más localhost en desarrollo
  const allowedOrigins = [
    process.env['FRONTEND_URL'] ?? 'http://localhost:3000',
    'http://localhost:3000',
  ].filter(Boolean)
  app.enableCors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origin (server-side, Swagger, curl)
      if (!origin) return callback(null, true)
      // Permitir cualquier subdominio de ngrok en desarrollo
      if (process.env['NODE_ENV'] !== 'production' && origin.endsWith('.ngrok-free.app')) {
        return callback(null, true)
      }
      if (process.env['NODE_ENV'] !== 'production' && origin.endsWith('.ngrok-free.dev')) {
        return callback(null, true)
      }
      if (allowedOrigins.includes(origin)) return callback(null, true)
      callback(new Error(`CORS bloqueado para origin: ${origin}`))
    },
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
    SwaggerModule.setup('api/docs', app, document, {
      customCssUrl: 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css',
      customJs: [
        'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js',
        'https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js',
      ],
    })
    Logger.log('Swagger disponible en /api/docs', 'Bootstrap')
  }

  const port = process.env['PORT'] ?? 3001
  await app.listen(port)
  Logger.log(`API corriendo en http://localhost:${port}`, 'Bootstrap')
}

bootstrap()
