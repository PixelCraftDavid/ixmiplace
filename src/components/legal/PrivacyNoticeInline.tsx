import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, X } from 'lucide-react';

type NoticeKind = 'account' | 'profile' | 'listing' | 'contact' | 'report';

const summaries: Record<NoticeKind, string> = {
  account: 'Usaremos tu nombre y correo para crear, verificar y proteger tu cuenta. Al registrarte con Google, Google también procesa los datos necesarios para iniciar sesión.',
  profile: 'Usaremos tu teléfono para completar tu perfil y facilitar el contacto relacionado con tus publicaciones. No lo mostramos en un anuncio salvo que decidas mostrarlo.',
  listing: 'Los datos, fotos, zona y ubicación mostrada en el mapa serán visibles públicamente. El teléfono de WhatsApp se muestra según la opción que elijas al publicar.',
  contact: 'El mensaje y tu nombre de perfil se compartirán con el propietario del anuncio para que pueda responderte dentro de IxmiPlace.',
  report: 'El reporte y los datos que incluyas serán visibles para el equipo administrador y se usarán para revisar el anuncio.',
};

export function PrivacyNoticeInline({ kind }: { kind: NoticeKind }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-ink-500 transition hover:bg-cream-100 hover:text-brand-700 dark:text-ink-300 dark:hover:bg-[#293027] dark:hover:text-brand-300"
      >
        <ShieldCheck className="h-3.5 w-3.5" /> Aviso de privacidad
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-dialog-title"
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-cream-200 bg-white p-6 text-ink-600 shadow-2xl dark:border-[#4b5847] dark:bg-[#242b22] dark:text-ink-200"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                  <ShieldCheck className="h-4 w-4" /> Tus datos en IxmiPlace
                </p>
                <h2 id="privacy-dialog-title" className="text-xl font-bold text-ink-800 dark:text-ink-50">
                  Aviso de privacidad
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar aviso de privacidad"
                className="rounded-full p-2 text-ink-500 hover:bg-cream-100 dark:text-ink-300 dark:hover:bg-[#323b2f]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm leading-relaxed">
              <p>El responsable es <strong>Ángel David Santos Pacheco</strong>, en Ixmiquilpan, Hidalgo. Para ejercer tus derechos o preguntar sobre tus datos, escribe a <a className="font-semibold underline" href="mailto:angeld10293@gmail.com">angeld10293@gmail.com</a>.</p>
              <p>{summaries[kind]}</p>
              <p>Puedes limitar la divulgación editando tu publicación u ocultando el teléfono. Para conocer los datos tratados, finalidades, proveedores y cómo ejercer tus derechos ARCO, consulta el aviso completo.</p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl border border-cream-300 px-4 py-2.5 text-sm font-semibold text-ink-600 hover:bg-cream-50 dark:border-[#4b5847] dark:text-ink-100 dark:hover:bg-[#323b2f]"
              >
                Cerrar
              </button>
              <Link
                to="/aviso-de-privacidad"
                onClick={() => setIsOpen(false)}
                className="rounded-xl bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-700"
              >
                Leer aviso completo
              </Link>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
