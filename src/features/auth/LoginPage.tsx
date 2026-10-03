import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '@/lib/firebase';
import { PrivacyNoticeInline } from '@/components/legal/PrivacyNoticeInline';
import { AuthLayout } from '@/components/layout/AuthLayout';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Correo inválido').max(254),
  password: z.string().min(1, 'Requerido'),
}).strict();
type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const nav = useNavigate();
  const location = useLocation();
  const accountDeleted = (location.state as { accountDeleted?: boolean } | null)?.accountDeleted === true;
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
    } catch (loginError) {
      const code = (loginError as { code?: string })?.code;
      setError(code === 'auth/too-many-requests'
        ? 'Firebase limitó temporalmente los intentos por actividad inusual. Espera un poco y vuelve a intentarlo; tu cuenta no se suspendió.'
        : code === 'auth/network-request-failed'
          ? 'No hay conexión con el servicio de acceso. Comprueba tu internet e inténtalo de nuevo.'
          : 'No se pudo iniciar sesión. Revisa tus datos e inténtalo de nuevo.');
    }
  }

  async function handleGoogle() {
    setError('');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      nav('/');
    } catch (loginError) {
      const code = (loginError as { code?: string })?.code;
      setError(code === 'auth/too-many-requests'
        ? 'Firebase limitó temporalmente los intentos por actividad inusual. Espera un poco y vuelve a intentarlo; tu cuenta no se suspendió.'
        : code === 'auth/popup-closed-by-user'
          ? 'Cerraste la ventana de Google antes de terminar el acceso.'
          : 'No se pudo iniciar con Google. Inténtalo de nuevo.');
    }
  }

  return (
    <AuthLayout
      eyebrow="Tu comunidad, tu hogar"
      title="Qué bueno verte de nuevo."
      description="Entra para seguir explorando propiedades y mantener tus conversaciones en un solo lugar."
      visualTitle="Tu próximo hogar puede estar más cerca de lo que imaginas."
      visualDescription="Rentas, casas y hospedaje en Ixmiquilpan. Descubre opciones locales y habla directamente con quien publica."
    >
        <div className="space-y-5">
          <PrivacyNoticeInline kind="account" />

          {accountDeleted && (
            <p role="status" className="rounded-xl border border-emerald-700/15 bg-emerald-50/80 p-3.5 text-sm leading-5 text-emerald-900 dark:border-emerald-200/15 dark:bg-emerald-900/20 dark:text-emerald-100">
              Tu cuenta y los datos asociados se eliminaron correctamente.
            </p>
          )}

          <button
            onClick={handleGoogle}
            type="button"
            className="motion-ease flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-ink-700/15 bg-white/70 px-4 py-3 font-semibold text-ink-700 shadow-[0_2px_8px_rgba(27,32,24,0.035)] transition duration-300 hover:-translate-y-0.5 hover:border-ink-700/25 hover:bg-white active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
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
            <span className="relative z-10 bg-[#f4f1e9] px-3 dark:bg-[#1c211a]">o usa tu correo</span>
            <span className="absolute inset-x-0 top-1/2 -z-0 h-px bg-ink-700/10 dark:bg-white/10" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            <label className="block space-y-1.5 text-xs font-medium text-ink-600 dark:text-ink-200">
              Correo electrónico
              <input
                {...register('email')}
                type="email"
                placeholder="nombre@correo.com"
                autoComplete="email"
                className="auth-input h-12 w-full rounded-xl border border-ink-700/15 bg-white/70 px-4 text-sm font-normal text-ink-800 shadow-[0_2px_8px_rgba(27,32,24,0.025)] outline-none transition duration-200 placeholder:text-ink-400 hover:border-ink-700/25 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-ink-300"
              />
            </label>
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}

            <label className="block space-y-1.5 text-xs font-medium text-ink-600 dark:text-ink-200">
              Contraseña
              <input
                {...register('password')}
                type="password"
                placeholder="Escribe tu contraseña"
                autoComplete="current-password"
                className="auth-input h-12 w-full rounded-xl border border-ink-700/15 bg-white/70 px-4 text-sm font-normal text-ink-800 shadow-[0_2px_8px_rgba(27,32,24,0.025)] outline-none transition duration-200 placeholder:text-ink-400 hover:border-ink-700/25 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-ink-300"
              />
            </label>
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}

            <div className="-mt-1 text-right">
              <Link to="/recuperar-contrasena" className="text-sm font-semibold text-brand-700 underline-offset-4 hover:underline dark:text-brand-200">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {error && <p role="alert" className="rounded-xl border border-red-700/15 bg-red-50/80 px-3.5 py-3 text-sm leading-5 text-red-800 dark:border-red-200/15 dark:bg-red-950/30 dark:text-red-200">{error}</p>}

            <button
              disabled={isSubmitting}
              className="motion-ease min-h-12 w-full rounded-xl bg-[#344a36] px-4 py-3 text-sm font-semibold text-white shadow-[0_7px_18px_rgba(35,59,40,0.16)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#293d2d] active:translate-y-0 disabled:cursor-wait disabled:opacity-60 dark:bg-[#597657] dark:hover:bg-[#668563]"
            >
              {isSubmitting ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <div className="flex items-center justify-center gap-2.5 border-t border-ink-700/10 pt-5 text-center dark:border-white/10">
            <span className="text-sm text-ink-500 dark:text-ink-300">¿Primera vez en IxmiPlace?</span>
            <Link
              to="/register"
              className="motion-ease rounded-lg px-2.5 py-2 text-sm font-semibold text-brand-800 transition duration-200 hover:bg-brand-700/[0.07] hover:text-brand-900 dark:text-brand-200 dark:hover:bg-white/[0.06]"
            >
              Regístrate
            </Link>
          </div>
        </div>
    </AuthLayout>
  );
}
