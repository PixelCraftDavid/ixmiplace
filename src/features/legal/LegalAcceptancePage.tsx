import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LegalAcceptanceFields } from '../../components/legal/LegalAcceptanceFields';
import { useAuth } from '../auth/AuthContext';
import { HouseLoader } from '../../components/ui/HouseLoader';
import { recordLegalAcceptance } from './recordLegalAcceptance';
import { PRIVACY_NOTICE_VERSION, TERMS_VERSION } from './legalVersions';

export function LegalAcceptancePage() {
  const { fbUser, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><HouseLoader variant="line" size="md" message="Cargando cuenta…" /></div>;
  }

  if (!fbUser) return <Navigate to="/login" replace />;
  if (
    profile?.termsAcceptedVersion === TERMS_VERSION &&
    profile?.privacyConsentVersion === PRIVACY_NOTICE_VERSION
  ) {
    return <Navigate to="/" replace />;
  }

  async function acceptCurrentTerms() {
    if (!fbUser || !acceptedTerms || !acceptedPrivacy) return;
    setSaving(true);
    setError('');
    try {
      await recordLegalAcceptance(fbUser);
      await refreshProfile();
      navigate('/', { replace: true });
    } catch (acceptanceError) {
      console.error('Error guardando la aceptación legal:', acceptanceError);
      setError('No pudimos guardar tu aceptación. Revisa la conexión e inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-24 dark:bg-[#1c211a]">
      <section className="w-full max-w-xl space-y-5 rounded-3xl border border-cream-200 bg-white p-7 shadow-sm dark:border-[#4b5847] dark:bg-[#293027] sm:p-9">
        <div>
          <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">Actualización legal</p>
          <h1 className="mt-2 text-2xl font-extrabold text-ink-800 dark:text-ink-50">Revisa y acepta para continuar</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-500 dark:text-ink-300">Actualizamos las reglas de uso y el Aviso de Privacidad. Tu cuenta seguirá igual; necesitamos guardar tu decisión antes de continuar.</p>
        </div>
        <LegalAcceptanceFields
          acceptedTerms={acceptedTerms}
          acceptedPrivacy={acceptedPrivacy}
          onTermsChange={setAcceptedTerms}
          onPrivacyChange={setAcceptedPrivacy}
        />
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button
          type="button"
          disabled={!acceptedTerms || !acceptedPrivacy || saving}
          onClick={() => void acceptCurrentTerms()}
          className="w-full rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Aceptar y continuar'}
        </button>
      </section>
    </main>
  );
}
