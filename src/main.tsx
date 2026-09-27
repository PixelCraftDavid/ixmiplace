import React from 'react';
import ReactDOM from 'react-dom/client';
import { app } from '@/lib/firebase';

// Fuente
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '@fontsource/poppins/800.css';

import { AppRouter } from '@/routes/AppRouter';
import './index.css';

const savedTheme = localStorage.getItem('ixmiplace:theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.classList.toggle(
  'dark',
  savedTheme === 'dark' || (savedTheme === null && prefersDark)
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const serviceWorkerUrl = new URL('/sw.js', window.location.origin);
  serviceWorkerUrl.searchParams.set('firebaseConfig', JSON.stringify(app.options));
  void navigator.serviceWorker.register(serviceWorkerUrl, { scope: '/' }).catch((error) => {
    console.error('No se pudo registrar el Service Worker de IxmiPlace:', error);
  });
}
