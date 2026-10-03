import { useEffect, useState } from 'react';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../lib/firebase';
import { useAuth } from './AuthContext';

export function VerifyEmailPage() {
  const nav = useNavigate();
  const { fbUser, refreshUser } = useAuth();
  const [sent, setSent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [resendSeconds, setResendSeconds] = useState(() => {
    const sentAt = Number(window.sessionStorage.getItem('ixmiplace:verification-email-sent-at'));
    return Number.isFinite(sentAt) && sentAt > 0
      ? Math.max(0, Math.ceil((sentAt + 60_000 - Date.now()) / 1000))
      : 0;
  });

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  async function resend() {
    if (!auth.currentUser || resendSeconds > 0 || resending) return;
    setResending(true);
    setMessage('');
    try {
      await sendEmailVerification(auth.currentUser);
      window.sessionStorage.setItem('ixmiplace:verification-email-sent-at', String(Date.now()));
      setResendSeconds(60);
      setSent(true);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === 'auth/too-many-requests') {
        window.sessionStorage.setItem('ixmiplace:verification-email-sent-at', String(Date.now()));
        setResendSeconds(60);
        setMessage('Firebase limitó temporalmente el envío de correos. Espera antes de solicitar otro.');
      } else {
        setMessage('No pudimos reenviar el correo. Comprueba tu conexión e inténtalo más tarde.');
      }
    } finally {
      setResending(false);
    }
  }

  async function checkVerified() {
    if (!auth.currentUser) return;
    setChecking(true);
    setMessage('');

    try {
      await auth.currentUser.reload();

      if (auth.currentUser.emailVerified) {
        // Actualizar el estado en AuthContext
        await refreshUser();
        // Redirigir
        nav('/', { replace: true });
      } else {
        setMessage('Aún no verificas tu correo. Revisa tu bandeja (y spam). Si ya lo hiciste, espera 30 segundos y vuelve a intentar.');
      }
    } catch (err) {
      console.error(err);
      setMessage('Error verificando. Intenta de nuevo.');
    } finally {
      setChecking(false);
    }
  }

  async function logout() {
    await signOut(auth);
    nav('/login');
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-lg text-center">
        <div className="text-5xl">📧</div>
        <h1 className="text-2xl font-bold">Verifica tu correo</h1>
        <p className="text-sm text-gray-600">
          Te enviamos un enlace a{' '}
          <strong className="text-gray-900">{fbUser?.email}</strong>.
          Ábrelo para activar tu cuenta.
        </p>

        {message && (
          <p className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
            {message}
          </p>
        )}

        <button
          onClick={checkVerified}
          disabled={checking}
          className="w-full rounded-xl bg-brand-600 py-3 font-semibold
                     text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {checking ? 'Verificando…' : 'Ya verifiqué mi correo'}
        </button>

        <button
          onClick={resend}
          disabled={resendSeconds > 0 || resending}
          className="w-full rounded-xl border border-gray-300 py-3
                     font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {resending
            ? 'Enviando…'
            : resendSeconds > 0
            ? `Puedes reenviar en ${resendSeconds} s`
            : sent ? 'Correo reenviado ✓ · Reenviar' : 'Reenviar correo'}
        </button>

        <button
          onClick={logout}
          className="text-sm text-gray-500 underline hover:text-gray-700"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
