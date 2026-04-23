/**
 * Configuración central de NextAuth v5.
 *
 * Proveedores disponibles:
 *  - Credentials: email + contraseña (bcrypt). Para usuarios registrados con formulario.
 *  - Google: OAuth. Crea usuario automáticamente si no existe.
 *
 * Estrategia de sesión: JWT (necesaria para Credentials + PrismaAdapter juntos).
 * El rol se almacena en el token JWT para evitar consultas a BD en cada request.
 *
 * Flujo de rol:
 *  1. Al iniciar sesión (jwt callback): se consulta el rol en la BD y se guarda en el token.
 *  2. Al leer sesión (session callback): el rol se copia del token a session.user.role.
 */
import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/infrastructure/database/prisma-client'

export const { handlers, auth, signIn, signOut } = NextAuth({
  // PrismaAdapter maneja la creación de usuarios y cuentas OAuth.
  // Con estrategia JWT, no se crean registros en la tabla Session.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma as any),

  // JWT es requerido para que el Credentials provider funcione junto con el adapter.
  session: { strategy: 'jwt' },

  providers: [
    // ─── Google OAuth ────────────────────────────────────────────────────────
    // Si el correo no existe en la BD, NextAuth lo crea automáticamente.
    Google({
      clientId: process.env['GOOGLE_CLIENT_ID'] ?? '',
      clientSecret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
    }),

    // ─── Credentials (email + contraseña) ───────────────────────────────────
    // Solo para usuarios registrados con formulario (/auth/register).
    // Los usuarios de Google NO tienen password — no pueden iniciar sesión aquí.
    Credentials({
      credentials: {
        email: { label: 'Correo electrónico', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        // Usuario no existe o no tiene contraseña (registrado con Google)
        if (!user || !user.password) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password,
        )
        if (!isValid) return null

        // Retornar los campos mínimos que NextAuth necesita
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],

  callbacks: {
    /**
     * JWT callback — se ejecuta al crear o actualizar el token.
     * `user` solo está disponible en el primer inicio de sesión.
     * Aprovechamos ese momento para añadir el rol al token.
     */
    async jwt({ token, user }) {
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email! },
          select: { id: true, role: true },
        })
        token.id = dbUser?.id ?? user.id
        token.role = dbUser?.role ?? 'CUSTOMER'
      }
      return token
    },

    /**
     * Session callback — transforma el token JWT en el objeto de sesión.
     * El cliente ve `session.user.role` e `session.user.id`.
     */
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        ;(session.user as typeof session.user & { role: string }).role =
          token.role as string
      }
      return session
    },
  },

  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
})
