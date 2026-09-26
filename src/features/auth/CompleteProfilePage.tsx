import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../../lib/firebase';
import { useAuth } from './AuthContext';
import { PrivacyNoticeInline } from '../../components/legal/PrivacyNoticeInline';

export function CompleteProfilePage() {
  const nav = useNavigate();
  const { profile, refreshProfile } = useAuth();  // ← UNA sola vez, DENTRO del componente
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setError('');
    if (!/^\d{10}$/.test(phone)) {
      setError('Ingresa 10 dígitos (sin espacios ni guiones).');
      return;
    }
    if (!auth.currentUser) {
      setError('Sesión expirada. Vuelve a iniciar sesión.');
      return;
    }

    setSaving(true);
    try {
      // 1. Guardar en Firestore
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { phone });

      // 2. Esperar a que refreshProfile termine
      await refreshProfile();

      // 3. Delay para que React propague el nuevo estado
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 4. Navegar
      nav('/', { replace: true });
    } catch (err) {
      console.error('Error guardando teléfono:', err);
      setError('No se pudo guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-lg">
        <div className="text-center space-y-1">
          <div className="text-5xl">📱</div>
          <h1 className="text-2xl font-bold">Completa tu perfil</h1>
          <p className="text-sm text-gray-500">
            Necesitamos tu WhatsApp para que los interesados te contacten.
          </p>
        </div>

        <PrivacyNoticeInline kind="profile" />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Número de WhatsApp
          </label>
          <input
            type="tel"
            inputMode="numeric"
            placeholder="7711234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            maxLength={10}
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5
                       focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="mt-1 text-xs text-gray-400">
            Solo 10 dígitos. Se usará en un enlace de WhatsApp.
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-brand-600 py-3 font-semibold
                     text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Guardar y continuar'}
        </button>
      </div>
    </div>
  );
}
