/**
 * POST /api/auth/register
 *
 * Registra un nuevo usuario con email y contraseña.
 * La contraseña se hashea con bcrypt (cost factor 12) antes de guardar.
 *
 * Respuestas:
 *  201 — Usuario creado correctamente
 *  409 — El correo ya está registrado
 *  422 — Datos de entrada inválidos (Zod)
 *
 * Nota: Este endpoint NO inicia sesión. Después de registrarse,
 * el cliente redirige al usuario a /auth/login para que inicie sesión.
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/infrastructure/database/prisma-client'

const registerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  email: z.string().email('Correo electrónico inválido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(72, 'La contraseña es demasiado larga'), // bcrypt tiene límite de 72 bytes
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const { name, email, password } = parsed.data

  // Verificar si el correo ya existe
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return Response.json(
      { error: 'Este correo ya está registrado. Intenta iniciar sesión.' },
      { status: 409 },
    )
  }

  // Hashear la contraseña (cost 12 — balance entre seguridad y velocidad)
  const hashedPassword = await bcrypt.hash(password, 12)

  // Crear el usuario con rol CUSTOMER por defecto
  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      // role: CUSTOMER es el default del schema
    },
  })

  return Response.json({ success: true }, { status: 201 })
}
