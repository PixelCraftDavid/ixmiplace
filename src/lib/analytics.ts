const CONSENT_KEY = 'ixmiplace:analytics-consent';
const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

let loadPromise: Promise<void> | undefined;

export function getAnalyticsMeasurementId() {
  return measurementId?.trim() ?? '';
}

export function getAnalyticsConsent(): 'granted' | 'denied' | null {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

export function saveAnalyticsConsent(value: 'granted' | 'denied') {
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Sin almacenamiento no se conserva la elección y no se carga analítica.
  }
}

export function loadGoogleAnalytics(): Promise<void> {
  const id = getAnalyticsMeasurementId();
  if (!id || getAnalyticsConsent() !== 'granted') return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve) => {
    window.dataLayer ??= [];
    window.gtag ??= (...args: unknown[]) => window.dataLayer?.push(args);
    window.gtag('js', new Date());
    window.gtag('config', id, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = undefined;
      resolve();
    };
    document.head.append(script);
  });

  return loadPromise;
}

export function trackPageView(path: string, title: string) {
  if (getAnalyticsConsent() !== 'granted' || !window.gtag) return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title,
    page_location: window.location.origin + path,
  });
}
