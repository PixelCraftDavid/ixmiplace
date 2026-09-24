import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { auth } from '../../lib/firebase';

export function SuspendedPage() {
  const navigate = useNavigate();

  async function logout() {
    await signOut(auth);
    navigate('/login', { replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4">
      <section className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-12 w-12 text-red-500" />
        <h1 className="mt-5 text-2xl font-bold text-ink">Cuenta suspendida</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-500">Tu cuenta no puede utilizar IxmiPlace en este momento. Si crees que es un error, contacta al administrador.</p>
        <button type="button" onClick={() => void logout()} className="mt-6 rounded-xl bg-brand-500 px-5 py-3 font-semibold text-white hover:bg-brand-600">Cerrar sesión</button>
      </section>
    </main>
  );
}