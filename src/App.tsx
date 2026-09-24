import { Hero } from './components/layout/Hero';

export default function App() {
  return (
    <main className="min-h-screen">
      <Hero />

      {/* Sección placeholder para el feed futuro */}
      <section id="propiedades" className="mx-auto max-w-6xl p-6 py-16">
        <h2 className="text-2xl font-bold mb-2">
          Propiedades en Ixmiquilpan
        </h2>
        <p className="text-gray-500">
          Aquí verás las publicaciones (Bloque 3 en adelante).
        </p>
      </section>
    </main>
  );
}