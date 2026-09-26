import { Heart, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export function SiteFooter() {
  return (
    <footer className="border-t border-cream-200 bg-cream-100 px-4 py-8 text-ink-600 dark:border-[#4b5847] dark:bg-[#1c211a] dark:text-ink-300">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold text-ink-700 dark:text-ink-50">
            Ixmi<span className="text-brand-600 dark:text-brand-300">Place</span>
          </p>
          <p className="mt-1 text-xs">Un proyecto independiente que sigue creciendo en Ixmiquilpan.</p>
        </div>
        <nav aria-label="Enlaces legales y de apoyo" className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
          <Link to="/aviso-de-privacidad" className="hover:text-brand-700 dark:hover:text-brand-300">Aviso de privacidad</Link>
          <Link to="/apoyar" className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200">
            <Heart className="h-4 w-4" /> Apoyar el proyecto
          </Link>
          <a href="mailto:angeld10293@gmail.com" className="inline-flex items-center gap-1.5 hover:text-brand-700 dark:hover:text-brand-300">
            <Mail className="h-4 w-4" /> Contacto
          </a>
        </nav>
      </div>
      <p className="mx-auto mt-5 max-w-7xl text-xs text-ink-400">© {new Date().getFullYear()} IxmiPlace · Hecho con cariño para Ixmiquilpan.</p>
    </footer>
  );
}
