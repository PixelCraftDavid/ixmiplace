import { ArrowDown, MapPin } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative isolate min-h-[min(760px,92svh)] overflow-hidden bg-ink-900 pt-24 text-white">
      <div
        className="absolute inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/ixmiquilpan-hero.jpg')" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 -z-10 bg-[#10140f]/65" aria-hidden="true" />
      <div className="absolute inset-y-0 left-0 -z-10 w-full bg-gradient-to-r from-[#10140f]/55 via-transparent to-transparent" aria-hidden="true" />

      <div className="mx-auto flex min-h-[min(760px,92svh)] max-w-7xl items-center px-5 pb-24 pt-10 sm:px-8 lg:px-12">
        <div className="hero-enter max-w-3xl">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-3.5 py-2 text-xs font-medium tracking-wide text-white/90 backdrop-blur-sm sm:text-sm">
            <MapPin className="h-4 w-4 text-accent-300" aria-hidden="true" />
            Vivienda local · Ixmiquilpan, Hidalgo
          </p>

          <h1 className="max-w-3xl text-[clamp(3rem,8vw,6.75rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-white">
            Encuentra tu
            <br />
            lugar en{' '}
            <span className="text-accent-300">Ixmiquilpan.</span>
          </h1>

          <p className="mt-7 max-w-xl text-base leading-7 text-white/80 sm:text-lg sm:leading-8">
            Casas, rentas y hospedaje para descubrir sin intermediarios. Explora opciones de la comunidad y habla directamente con quien publica.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="#propiedades"
              className="motion-ease group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-400 px-5 py-3 text-sm font-semibold text-ink-900 shadow-[0_8px_30px_rgba(212,154,74,0.18)] transition duration-300 hover:-translate-y-0.5 hover:bg-accent-300 active:translate-y-0"
            >
              Explorar propiedades
              <ArrowDown className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" aria-hidden="true" />
            </a>
          </div>

          <div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/15 pt-5 text-xs font-medium text-white/65 sm:text-sm">
            <span>Rentas y ventas</span>
            <span>Hospedaje local</span>
            <span>Trato directo</span>
          </div>
        </div>
      </div>

      <a
        href="#propiedades"
        aria-label="Desplazarse a las propiedades"
        className="motion-ease absolute bottom-7 left-1/2 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-white/20 text-white/75 transition duration-300 hover:-translate-y-1 hover:border-white/45 hover:text-white"
      >
        <ArrowDown className="h-4 w-4" aria-hidden="true" />
      </a>
    </section>
  );
}
