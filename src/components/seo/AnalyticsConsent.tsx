import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import {
  getAnalyticsConsent,
  getAnalyticsMeasurementId,
  loadGoogleAnalytics,
  saveAnalyticsConsent,
  trackPageView,
} from '../../lib/analytics';

export function AnalyticsConsent() {
  const { pathname } = useLocation();
  const [consent, setConsent] = useState<'granted' | 'denied' | null>(null);
  const [visible, setVisible] = useState(false);
  const configured = Boolean(getAnalyticsMeasurementId());

  useEffect(() => {
    if (!configured) return;
    const saved = getAnalyticsConsent();
    setConsent(saved);
    setVisible(saved === null);

    const showSettings = () => setVisible(true);
    window.addEventListener('ixmiplace:analytics-settings', showSettings);
    return () => window.removeEventListener('ixmiplace:analytics-settings', showSettings);
  }, [configured]);

  useEffect(() => {
    if (consent !== 'granted' || !configured) return;
    // Only measure public content paths; never send auth/profile/form URLs or query tokens.
    const isPublicPage = /^\/(?:aviso-de-privacidad|terminos|apoyar|listing\/[^/]+|propietario\/[^/]+)\/?$/.test(pathname);
    if (!isPublicPage) return;
    void loadGoogleAnalytics().then(() => {
      trackPageView(pathname, document.title);
    });
  }, [consent, configured, pathname]);

  function choose(value: 'granted' | 'denied') {
    saveAnalyticsConsent(value);
    setConsent(value);
    setVisible(false);
  }

  if (!configured || !visible) return null;

  return (
    <aside className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-2xl rounded-2xl border border-cream-200 bg-white p-5 text-ink shadow-[0_16px_60px_rgba(20,28,19,0.2)] dark:border-[#4b5847] dark:bg-[#293027] dark:text-ink-50" aria-label="Preferencias de analítica" role="dialog" aria-modal="false">
      <div className="flex items-start gap-3">
        <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-brand-700 dark:text-brand-200" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">¿Permites analítica opcional?</h2>
          <p className="mt-1 text-sm leading-6 text-ink-500 dark:text-ink-300">
            IxmiPlace puede medir páginas visitadas para mejorar el sitio. Google Analytics solo se carga si aceptas; puedes rechazarlo sin perder funciones.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => choose('granted')} className="min-h-10 rounded-lg bg-[#344a36] px-4 py-2 text-sm font-semibold text-white hover:bg-[#293d2d] dark:bg-[#597657] dark:hover:bg-[#668563]">Aceptar analítica</button>
            <button type="button" onClick={() => choose('denied')} className="min-h-10 rounded-lg border border-cream-300 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-cream-50 dark:border-[#4b5847] dark:text-ink-100 dark:hover:bg-[#323b2f]">Solo lo necesario</button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function AnalyticsPreferencesButton() {
  if (!getAnalyticsMeasurementId()) return null;
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event('ixmiplace:analytics-settings'))} className="rounded-lg text-left font-semibold text-brand-700 underline dark:text-brand-300">
      Administrar la preferencia de analítica
    </button>
  );
}
