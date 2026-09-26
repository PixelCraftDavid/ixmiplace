import { Link } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, Check, Copy, Heart, Mail, Sparkles } from 'lucide-react';

const supportClabe = '722969010339439625';

export function SupportPage() {
  const [copied, setCopied] = useState(false);

  async function copyClabe() {
    try {
      await navigator.clipboard.writeText(supportClabe);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream px-4 pb-16 pt-24 text-ink dark:bg-[#1c211a] dark:text-ink-50">
      <div className="mx-auto max-w-3xl py-8">
        <Link to="/" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-brand-700 dark:text-ink-300 dark:hover:text-brand-300">
          <ArrowLeft className="h-4 w-4" /> Volver a IxmiPlace
        </Link>

        <section className="overflow-hidden rounded-3xl border border-cream-200 bg-white shadow-sm dark:border-[#4b5847] dark:bg-[#293027]">
          <div className="bg-gradient-to-br from-brand-700 via-brand-600 to-amber-500 px-7 py-10 text-white sm:px-10">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Heart className="h-6 w-6" /></div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/80">Apoyo voluntario</p>
            <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Ayúdame a seguir construyendo</h1>
            <p className="mt-4 max-w-2xl leading-relaxed text-white/90">IxmiPlace todavía está en desarrollo, pero ya puedes probarlo. Con el tiempo seguiré incorporando mejoras notables para que más personas encuentren y compartan opciones de vivienda en Ixmiquilpan.</p>
          </div>

          <div className="space-y-6 p-7 sm:p-10">
            <div className="space-y-4 leading-relaxed text-ink-600 dark:text-ink-200">
              <p>Este proyecto nació de las ganas de crear algo útil para nuestra comunidad y de seguir creciendo como desarrollador. Cada mejora es una oportunidad para acercar nuevas tecnologías a Ixmiquilpan.</p>
              <p>Si decides donar, tu aportación voluntaria será para apoyar a mi mamá. Tu apoyo y confianza también me darán ánimo para crecer como desarrollador, seguir mejorando IxmiPlace y acercar nuevas tecnologías a Ixmiquilpan.</p>
              <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100">No necesitas donar para usar IxmiPlace. El apoyo no compra una publicación, una posición preferente ni un servicio especial; puedes probar el proyecto y usarlo sin aportar.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => void copyClabe()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white transition hover:bg-brand-700">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'CLABE copiada' : 'Copiar CLABE de Mercado Pago'}
              </button>
              <a href="mailto:angeld10293@gmail.com?subject=Apoyo%20voluntario%20a%20IxmiPlace" className="inline-flex items-center justify-center gap-2 rounded-xl border border-cream-300 px-5 py-3 font-semibold text-ink-600 transition hover:bg-cream-50 dark:border-[#4b5847] dark:text-ink-100 dark:hover:bg-[#323b2f]">
                <Mail className="h-4 w-4" /> Contactarme
              </a>
              <Link to="/aviso-de-privacidad" className="inline-flex items-center justify-center gap-2 rounded-xl border border-cream-300 px-5 py-3 font-semibold text-ink-600 transition hover:bg-cream-50 dark:border-[#4b5847] dark:text-ink-100 dark:hover:bg-[#323b2f]">
                Consultar privacidad
              </Link>
            </div>

            <div className="rounded-2xl border border-cream-200 bg-cream-50 p-5 dark:border-[#4b5847] dark:bg-[#242b22]">
              <p className="text-sm font-semibold text-ink-700 dark:text-ink-100">CLABE para transferencia SPEI · Mercado Pago</p>
              <p className="mt-2 break-all font-mono text-lg font-bold tracking-wider text-ink-800 dark:text-ink-50">{supportClabe}</p>
              <p className="mt-2 text-xs leading-relaxed text-ink-500 dark:text-ink-300">La CLABE queda visible para cualquier persona que visite esta página. Verifica el nombre del destinatario en tu aplicación bancaria antes de confirmar la transferencia. El apoyo es voluntario y se destina a apoyar a mi mamá.</p>
            </div>

            <p className="flex items-start gap-2 border-t border-cream-200 pt-5 text-xs leading-relaxed text-ink-400 dark:border-[#4b5847] dark:text-ink-400">
              <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-500" />
              IxmiPlace no procesa ni confirma transferencias. La operación se realiza desde tu banco o Mercado Pago; nunca envíes datos de tarjeta, contraseñas ni códigos de seguridad por correo.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
