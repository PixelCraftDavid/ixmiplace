import React from 'react';
import ReactDOM from 'react-dom/client';

// Fuente
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '@fontsource/poppins/800.css';

import { AppRouter } from '@/routes/AppRouter';
import { showConsoleWarning } from '@/lib/consoleWarning';
import './index.css';

showConsoleWarning();

let savedTheme: string | null = null;
try {
  savedTheme = localStorage.getItem('ixmiplace:theme');
} catch {
  // Almacenamiento bloqueado: se usa la preferencia del sistema.
}
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

