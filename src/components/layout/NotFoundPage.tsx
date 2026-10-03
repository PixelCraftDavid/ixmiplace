import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';

export function NotFoundPage() {
  return (
    <main className="flex min-h-[75svh] items-center bg-cream px-4 py-14 text-ink dark:bg-[#1c211a] dark:text-ink-50">
      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 rounded-[2rem] border border-cream-200 bg-white p-6 shadow-[0_24px_80px_rgba(27,32,24,0.08)] dark:border-[#4b5847] dark:bg-[#293027] sm:p-10 lg:grid-cols-[1fr_1.1fr] lg:p-14">
        <div className="order-2 max-w-xl lg:order-1">
          <p className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-amber-900 dark:bg-amber-900/25 dark:text-amber-200">
            <MapPin className="h-4 w-4" aria-hidden="true" /> Ruta equivocada
          </p>
          <p className="mt-7 text-7xl font-bold leading-none tracking-tight text-brand-700 dark:text-brand-200">404</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Parece que nos perdimos.</h1>
          <p className="mt-4 max-w-lg leading-7 text-ink-500 dark:text-ink-300">
            Esta dirección no existe o la publicación ya no está disponible. El camino sigue; volvamos a IxmiPlace.
          </p>
          <Link to="/" className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#344a36] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#293d2d] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-accent-400 dark:bg-[#597657] dark:hover:bg-[#668563]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a IxmiPlace
          </Link>
        </div>

        <div className="order-1 mx-auto w-full max-w-[34rem] lg:order-2" role="img" aria-label="Un viajero se detuvo en el camino porque se ponchó una llanta de su carrito de equipaje y revisa un mapa para encontrar la ruta correcta.">
          <svg viewBox="0 0 640 470" className="h-auto w-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <linearGradient id="road" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#f6e8c9"/><stop offset="1" stopColor="#e9d3a9"/></linearGradient>
              <linearGradient id="suitcase" x1="0" x2="1"><stop stopColor="#77916f"/><stop offset="1" stopColor="#506c50"/></linearGradient>
            </defs>
            <ellipse cx="320" cy="414" rx="260" ry="25" fill="#263426" opacity=".08"/>
            <path d="M38 361c110-55 189-22 278-64 89-42 155-108 281-127" fill="none" stroke="url(#road)" strokeWidth="96" strokeLinecap="round"/>
            <path d="M38 361c110-55 189-22 278-64 89-42 155-108 281-127" fill="none" stroke="#fff8e9" strokeWidth="3" strokeDasharray="14 18" strokeLinecap="round" opacity=".8"/>
            <path d="M89 125c0-37 31-67 68-67h108c37 0 67 30 67 67v95H89z" fill="#edf1e2"/>
            <path d="M89 124c0-37 31-67 68-67h108c37 0 67 30 67 67" fill="none" stroke="#7d9775" strokeWidth="8" strokeLinecap="round"/>
            <path d="M126 132h167M126 166h132M126 200h103" stroke="#b8c7ad" strokeWidth="9" strokeLinecap="round"/>
            <circle cx="231" cy="132" r="13" fill="#d79b48"/><path d="m231 120 3 12-3 12-3-12z" fill="#fff8e9"/>
            <g transform="translate(367 189) rotate(-9)">
              <path d="M-40 11 16-42l80 78-56 54z" fill="#fffaf0" stroke="#587153" strokeWidth="5" strokeLinejoin="round"/>
              <path d="m-12 8 25-23 19 17 20-17 17 19M-2 38l20-18 17 14 18-17 18 18" fill="none" stroke="#a5bb97" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="m28-16 18 2 1 19-19-2z" fill="#dca24d"/>
              <circle cx="42" cy="-6" r="8" fill="#a64836" stroke="#fffaf0" strokeWidth="3"/>
            </g>
            <g transform="translate(242 266)">
              <path d="m18 31 32-21 36 9 28-18 28 20-16 80-102 9z" fill="url(#suitcase)" stroke="#344a36" strokeWidth="5" strokeLinejoin="round"/>
              <path d="m55 16 2-18c1-9 9-15 18-14l17 2c9 1 15 9 14 18l-2 13" fill="none" stroke="#344a36" strokeWidth="8" strokeLinecap="round"/>
              <path d="m64 20-4 78m50-75-8 74" stroke="#a8b99c" strokeWidth="4" opacity=".8"/>
              <path d="m53 105-4 43m83-47-2 37" stroke="#344a36" strokeWidth="7" strokeLinecap="round"/>
              <circle cx="45" cy="154" r="14" fill="#344a36"/><circle cx="45" cy="154" r="6" fill="#dfe7d7"/>
              <circle cx="128" cy="145" r="14" fill="#fff" stroke="#a64836" strokeWidth="6" strokeDasharray="9 5"/>
              <path d="m127 128 5-7m6 17 9-1m-21 12 6 8" stroke="#a64836" strokeWidth="3" strokeLinecap="round"/>
            </g>
            <g transform="translate(176 218)">
              <circle cx="0" cy="0" r="29" fill="#d99a46"/>
              <path d="M-27-9c6-20 34-28 48-10-4 16-21 24-43 23z" fill="#344a36"/>
              <path d="M-18 27c-5 13-6 27-4 41l38 6 11-47" fill="#536e53"/>
              <path d="m-16 68-13 48m46-42 26 38" stroke="#263426" strokeWidth="13" strokeLinecap="round"/>
              <path d="m24 41 34-27 37 18-7 35-39 16" fill="none" stroke="#263426" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="m62 14 26-19 26 13-25 23z" fill="#fff8e9" stroke="#344a36" strokeWidth="4" strokeLinejoin="round"/>
              <path d="m73 4 27 3M68 12l26 4" stroke="#a5bb97" strokeWidth="3" strokeLinecap="round"/>
            </g>
            <path d="M492 111v-36m-13 13 13-13 13 13" fill="none" stroke="#d49a4a" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="515" cy="94" r="4" fill="#a64836"/><circle cx="116" cy="295" r="5" fill="#d49a4a"/><circle cx="556" cy="291" r="5" fill="#7d9775"/>
          </svg>
        </div>
      </section>
    </main>
  );
}
