"use client";

/**
 * Página de registro de nuevos usuarios.
 *
 * Flujo:
 *  1. Usuario llena nombre, correo, contraseña y confirmación.
 *  2. Se llama POST /api/auth/register (valida y crea el usuario en BD con bcrypt).
 *  3. Si es exitoso, redirige a /auth/login con mensaje de bienvenida.
 *  4. Si el correo ya existe, muestra error inline.
 *
 * Los usuarios registrados aquí reciben rol CUSTOMER.
 * Para obtener rol ADMIN, un administrador debe cambiarlo desde Prisma Studio o BD.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedMarketing, setAcceptedMarketing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const res = await fetch(`${apiBase}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });

      const data = (await res.json()) as { error?: string; message?: string };

      if (!res.ok) {
        setError(data.message ?? data.error ?? "Error al crear la cuenta. Intenta de nuevo.");
        return;
      }

      router.push(`/auth/verify-email?email=${encodeURIComponent(form.email)}`);
    } catch {
      setError("Error de red. Verifica tu conexión e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-10">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 w-full max-w-md">
        {/* Encabezado */}
        <div className="text-center mb-8 ">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/assets/logo.png"
              alt="Electro Motos Tony"
              width={80}
              height={60}
              className="object-contain block mx-auto"
              priority
            />
          </Link>
          <p className="text-white/50 mt-1 text-sm">Crea tu cuenta gratuita</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error inline */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* Nombre completo */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-white/70 mb-1"
            >
              Nombre completo *
            </label>
            <input
              id="name"
              type="text"
              required
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Juan Pérez"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Correo electrónico */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-white/70 mb-1"
            >
              Correo electrónico *
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="tu@correo.com"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Contraseña */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-white/70"
              >
                Contraseña *{" "}
                <span className="text-white/30 font-normal">
                  (mín. 8 caracteres)
                </span>
              </label>
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-white/70 mb-1"
            >
              Confirmar contraseña *
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm({ ...form, confirmPassword: e.target.value })
              }
              placeholder="••••••••"
              className={`w-full bg-white/5 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none transition-colors border ${
                form.confirmPassword && form.password !== form.confirmPassword
                  ? "border-red-500/50 focus:border-red-500"
                  : "border-white/10 focus:border-blue-500"
              }`}
            />
            {form.confirmPassword && form.password !== form.confirmPassword && (
              <p className="text-xs text-red-400 mt-1">
                Las contraseñas no coinciden
              </p>
            )}
          </div>

          {/* Consentimientos legales */}
          <div className="space-y-3 pt-1">
            {/* Obligatorio: T&C + Privacidad */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                required
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                aria-required="true"
                aria-describedby="terms-description"
                className="mt-0.5 w-4 h-4 shrink-0 rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-500 focus:ring-offset-black accent-blue-500"
              />
              <span
                id="terms-description"
                className="text-xs text-white/60 leading-relaxed group-hover:text-white/80 transition-colors"
              >
                He leído y acepto los{" "}
                <Link
                  href="/legal/terminos-y-condiciones"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline hover:text-blue-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  Términos y condiciones
                </Link>{" "}
                y la{" "}
                <Link
                  href="/legal/politica-de-privacidad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline hover:text-blue-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  Política de privacidad
                </Link>
                .{" "}
                <span className="text-white/30">(Obligatorio)</span>
              </span>
            </label>

            {/* Opcional: marketing */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={acceptedMarketing}
                onChange={(e) => setAcceptedMarketing(e.target.checked)}
                className="mt-0.5 w-4 h-4 shrink-0 rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-500 focus:ring-offset-black accent-blue-500"
              />
              <span className="text-xs text-white/60 leading-relaxed group-hover:text-white/80 transition-colors">
                Acepto recibir promociones y novedades por correo electrónico.{" "}
                <span className="text-white/30">(Opcional)</span>
              </span>
            </label>
          </div>

          {/* Botón de registro */}
          <button
            type="submit"
            disabled={loading || !acceptedTerms}
            aria-disabled={!acceptedTerms}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-blue-500 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        {/* Separador */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#0a0a0a] px-3 text-xs text-white/30">
              o regístrate con
            </span>
          </div>
        </div>

        {/* Google */}
        <Link
          href="/auth/login"
          className="w-full flex items-center justify-center gap-3 border border-white/10 rounded-lg py-2.5 px-4 text-sm font-medium text-white hover:border-white/30 hover:bg-white/5 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continuar con Google
        </Link>

        {/* Link a login */}
        <p className="text-sm text-white/40 text-center mt-6">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/auth/login"
            className="text-blue-400 font-semibold hover:underline"
          >
            Inicia sesión
          </Link>
        </p>

        <p className="text-sm text-white/40 text-center mt-1">
          <Link href="/">← Volver a el Inicio</Link>
        </p>

      </div>
    </div>
  );
}
