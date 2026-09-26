import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '@/lib/firebase';
import { HouseScene } from '@/components/three/HouseScene';
import { PrivacyNoticeInline } from '@/components/legal/PrivacyNoticeInline';

const schema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(1, 'Requerido'),
});
type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const nav = useNavigate();
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setError('');
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      nav('/');
    } catch {
      setError('No se pudo iniciar sesión. Revisa tus datos e inténtalo de nuevo.');
    }
  }

  async function handleGoogle() {
    setError('');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      nav('/');
    } catch {
      setError('No se pudo iniciar con Google. Inténtalo de nuevo.');
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ───────── Panel izquierdo: formulario ───────── */}
      <div className="flex w-full items-center justify-center px-4 py-10 lg:w-1/2">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1.5 text-center">
            <h1 className="text-5xl font-extrabold tracking-tight text-ink sm:text-6xl">
              Ixmi<span className="text-brand-600">Place</span>
            </h1>
            <p className="text-sm text-ink-400">Bienvenido de vuelta</p>
          </div>

          <PrivacyNoticeInline kind="account" />

          <button
            onClick={handleGoogle}
            type="button"
            className="flex w-full items-center justify-center gap-3
                       rounded-xl border border-cream-300 py-2.5
                       font-medium text-ink-700 transition hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.1 26.8 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.6 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C40.9 35.9 44 30.5 44 24c0-1.2-.1-2.3-.4-3.5z"/>
            </svg>
            Continuar con Google
          </button>

          <div className="relative text-center text-xs text-ink-400">
            <span className="relative z-10 bg-white px-3">o con correo</span>
            <span className="absolute inset-x-0 top-1/2 -z-0 h-px bg-cream-200" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input
              {...register('email')}
              type="email"
              placeholder="Correo"
              autoComplete="email"
              className="w-full rounded-xl border border-cream-300 px-4 py-2.5
                         focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}

            <input
              {...register('password')}
              type="password"
              placeholder="Contraseña"
              autoComplete="current-password"
              className="w-full rounded-xl border border-cream-300 px-4 py-2.5
                         focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              disabled={isSubmitting}
              className="w-full rounded-xl bg-brand-600 py-3 font-semibold
                         text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <div className="flex items-center justify-center gap-3 pt-2">
            <span className="text-sm text-ink-400">¿No tienes cuenta?</span>
            <Link
              to="/register"
              className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold
                         text-white shadow-md shadow-brand-500/30 transition
                         hover:bg-brand-600 hover:shadow-lg"
            >
              Regístrate
            </Link>
          </div>
        </div>
      </div>

      {/* ───────── Panel derecho: animación 3D ───────── */}
      <div className="relative hidden overflow-hidden bg-gradient-to-b from-[#0d1b1f] via-[#132a24] to-[#0a1512] lg:block lg:w-1/2">
        <div className="absolute inset-0">
          <HouseScene />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-10">
          <p className="text-2xl font-bold text-white">
            Tu próximo hogar te está esperando
          </p>
          <p className="mt-1 text-sm text-white/70">
            Rentas, casas y hospedaje en Ixmiquilpan, sin intermediarios.
          </p>
        </div>
      </div>
    </div>
  );
}
