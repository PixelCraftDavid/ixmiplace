import { Link } from 'react-router-dom';

type NoticeKind = 'account' | 'profile' | 'listing' | 'contact' | 'report';

const summaries: Record<NoticeKind, string> = {
  account: 'Usaremos tu nombre y correo para crear, verificar y proteger tu cuenta. Al registrarte con Google, Google también procesa los datos necesarios para iniciar sesión.',
  profile: 'Usaremos tu teléfono para completar tu perfil y facilitar el contacto relacionado con tus publicaciones. No lo mostramos en un anuncio salvo que decidas mostrarlo.',
  listing: 'Los datos, fotos, zona y ubicación mostrada en el mapa serán visibles públicamente. El teléfono de WhatsApp se muestra según la opción que elijas al publicar.',
  contact: 'El mensaje y tu nombre de perfil se compartirán con el propietario del anuncio para que pueda responderte dentro de IxmiPlace.',
  report: 'El reporte y los datos que incluyas serán visibles para el equipo administrador y se usarán para revisar el anuncio.',
};

export function PrivacyNoticeInline({ kind }: { kind: NoticeKind }) {
  return (
    <p className="rounded-xl border border-cream-200 bg-cream-50 px-4 py-3 text-xs leading-relaxed text-ink-500 dark:border-[#4b5847] dark:bg-[#242b22] dark:text-ink-300">
      El responsable es <strong>Ángel David Santos Pacheco</strong>, con domicilio en Ixmiquilpan, Hidalgo. {summaries[kind]} Puedes limitar la divulgación editando tu publicación u ocultando el teléfono; para limitar otros usos no esenciales o ejercer tus derechos, escribe a{' '}
      <a className="font-semibold underline underline-offset-2" href="mailto:angeld10293@gmail.com">angeld10293@gmail.com</a>.{' '}
      <Link to="/aviso-de-privacidad" className="font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-300">
        Consulta el Aviso de Privacidad Integral
      </Link>
    </p>
  );
}
