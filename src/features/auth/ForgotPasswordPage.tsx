import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { auth } from '../../lib/firebase';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { HoneypotField } from '../../components/ui/HoneypotField';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Escribe un correo válido.').max(254),
}).strict();
type FormData = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [website, setWebsite] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit({ email }: FormData) {
    setError('');
    if (website.trim()) return;
    try {
      auth.languageCode = 'es';
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (cause) {
      const code = (cause as { code?: string })?.code;
      if (code === 'auth/too-many-requests') {
        setError('Firebase limitó temporalmente las solicitudes. Espera un momento antes de intentarlo de nuevo.');
      } else {
        // Respuesta deliberadamente genérica para no revelar si el correo tiene cuenta.
        setSent(true);
      }
    }
  }

  return (
    <AuthLayout
      eyebrow="Recuperación de cuenta"
      title={sent ? 'Revisa tu correo.' : 'Recupera tu acceso.'}
      description={sent
        ? 'Si existe una cuenta con ese correo, Firebase enviará un enlace para crear una contraseña nueva.'
        : 'Te enviaremos un enlace de un solo uso para confirmar el acceso al correo y elegir una contraseña nueva.'}
      visualTitle="Tu cuenta sigue siendo tuya."
      visualDescription="Confirma el acceso desde tu correo para volver a IxmiPlace."
    >
      {sent ? (
        <div className="space-y-5">
          <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-700/15 bg-emerald-50/80 p-4 text-sm leading-6 text-emerald-900 dark:border-emerald-200/15 dark:bg-emerald-900/20 dark:text-emerald-100">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p>Solicitud procesada. Revisa tu bandeja de entrada y spam. Si el correo corresponde a una cuenta, encontrarás el enlace de restablecimiento.</p>
          </div>
          <Link to="/login" className="motion-ease flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#344a36] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#293d2d] active:translate-y-0 dark:bg-[#597657] dark:hover:bg-[#668563]">
            <ArrowLeft className="h-4 w-4" /> Volver a iniciar sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <HoneypotField value={website} onChange={setWebsite} />
          <label className="block space-y-1.5 text-xs font-medium text-ink-600 dark:text-ink-200">
            Correo electrónico de tu cuenta
            <span className="relative block">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                maxLength={254}
                placeholder="nombre@correo.com"
                className="auth-input h-12 w-full rounded-xl border border-ink-700/15 bg-white/70 pl-11 pr-4 text-sm font-normal text-ink-800 shadow-[0_2px_8px_rgba(27,32,24,0.025)] outline-none transition duration-200 placeholder:text-ink-400 hover:border-ink-700/25 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-ink-300"
              />
            </span>
          </label>
          {errors.email && <p role="alert" className="text-sm text-red-600">{errors.email.message}</p>}
          {error && <p role="alert" className="rounded-xl border border-amber-700/15 bg-amber-50/80 px-3.5 py-3 text-sm leading-5 text-amber-900 dark:border-amber-200/15 dark:bg-amber-950/30 dark:text-amber-100">{error}</p>}

          <p className="rounded-xl border border-ink-700/10 bg-white/45 p-3.5 text-xs leading-5 text-ink-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-ink-300">
            El enlace de Firebase funciona como comprobación de que puedes abrir ese correo; no necesitas escribir un código aquí. El enlace vence y solo puede usarse para este restablecimiento.
          </p>

          <button disabled={isSubmitting} className="motion-ease flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#344a36] px-4 py-3 text-sm font-semibold text-white shadow-[0_7px_18px_rgba(35,59,40,0.16)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#293d2d] active:translate-y-0 disabled:cursor-wait disabled:opacity-60 dark:bg-[#597657] dark:hover:bg-[#668563]">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {isSubmitting ? 'Enviando…' : 'Enviar enlace de recuperación'}
          </button>
          <Link to="/login" className="flex min-h-10 items-center justify-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-200">
            <ArrowLeft className="h-4 w-4" /> Volver a iniciar sesión
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}
