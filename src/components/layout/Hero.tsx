import { Link } from 'react-router-dom';

export function Hero() {
  return (
    <section className="relative h-screen w-full overflow-hidden">

      {/* Capa 1: Imagen de fondo */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/ixmiquilpan-hero.jpg')" }}
        aria-hidden="true"
      />

      {/* Capa 2: Blur + oscurecido en la mitad inferior */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1/2
                   backdrop-blur-md
                   bg-gradient-to-b
                   from-transparent via-black/50 to-black/85"
        aria-hidden="true"
      />

      {/* Capa 3: Oscurecido lateral izquierdo para legibilidad del texto */}
      <div
        className="absolute inset-0
                   bg-gradient-to-r
                   from-black/60 via-black/30 to-transparent"
        aria-hidden="true"
      />

      {/* Capa 4: Contenido — texto a la izquierda */}
      <div className="relative z-10 flex h-full items-center
                      px-8 sm:px-12 md:px-20 lg:px-32">
        <div className="max-w-2xl text-left">

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl
                         font-extrabold leading-[1.05]
                         text-white drop-shadow-2xl">
            Ixmi<span className="text-brand-400">Place</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl md:text-2xl
                        font-light text-white/95 drop-shadow-lg">
            Encuentra rentas, casas y hospedaje
            <span className="block font-medium text-white">
              en Ixmiquilpan, sin intermediarios.
            </span>
          </p>

          <p className="mt-4 text-sm sm:text-base text-white/75 max-w-xl">
            Contacta directamente con el propietario por WhatsApp.
            Publicar es gratis. Encontrar es gratis. Simple.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <a
              href="#propiedades"
              className="rounded-full bg-brand-600 px-8 py-3.5
                         text-white font-semibold text-base
                         hover:bg-brand-500 transition-all
                         shadow-2xl shadow-brand-900/40
                         hover:scale-105 text-center"
            >
              Ver propiedades
            </a>

            <Link
              to="/publicar"
              className="rounded-full bg-white/10 backdrop-blur-md
                         border border-white/30
                         px-8 py-3.5
                         text-white font-semibold text-base
                         hover:bg-white/20 transition-all
                         hover:scale-105 text-center"
            >
              Publicar mi propiedad
            </Link>
          </div>
        </div>
      </div>

      {/* Indicador de scroll */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2
                      z-10 text-white/60 animate-bounce">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M19 12l-7 7-7-7"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </section>
  );
}