import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_ORIGIN = 'https://ixmiplace.vercel.app';
const DEFAULT_DESCRIPTION = 'Encuentra opciones de vivienda y hospedaje en Ixmiquilpan, Hidalgo.';

function upsertMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.append(element);
  }
  element.content = content;
}

function upsertCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.append(element);
  }
  element.href = href;
}

export interface PageMetaOptions {
  image?: string;
  noIndex?: boolean;
  structuredData?: Record<string, unknown> | null;
}

/** Updates browser and crawler metadata for client-side routes. */
export function usePageMeta(title: string, description: string, options: PageMetaOptions = {}) {
  const { image, noIndex = false, structuredData = null } = options;

  useEffect(() => {
    const canonicalUrl = `${SITE_ORIGIN}${window.location.pathname}`;
    const pageTitle = title || 'IxmiPlace';
    const pageDescription = description || DEFAULT_DESCRIPTION;
    document.title = pageTitle;
    upsertMeta('meta[name="description"]', 'name', 'description', pageDescription);
    upsertMeta('meta[name="robots"]', 'name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', pageTitle);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', pageDescription);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
    upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', 'IxmiPlace');
    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', pageTitle);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', pageDescription);
    if (image) {
      const absoluteImage = image.startsWith('http') ? image : `${SITE_ORIGIN}${image}`;
      upsertMeta('meta[property="og:image"]', 'property', 'og:image', absoluteImage);
      upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', absoluteImage);
    }
    upsertCanonical(canonicalUrl);

    const previousStructuredData = document.head.querySelector('#ixmiplace-page-structured-data');
    previousStructuredData?.remove();
    if (structuredData) {
      const script = document.createElement('script');
      script.id = 'ixmiplace-page-structured-data';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(structuredData);
      document.head.append(script);
    }
  }, [title, description, image, noIndex, structuredData]);
}

export function RouteMetadata() {
  const { pathname } = useLocation();
  // Keep the raw pathname: malformed percent-encoding must not break rendering.
  const path = pathname;
  const protectedRoute = /^\/(?:login|register|recuperar-contrasena|verify-email|complete-profile|perfil|publicar|publicar-roomie|roomies|editar|mis-publicaciones|favoritos|notificaciones|mensajes|historial|admin|aceptacion-legal|cuenta-suspendida)(?:\/|$)/.test(path);
  const routeCopy: Array<[RegExp, string, string]> = [
    [/^\/login\/?$/, 'Inicia sesión | IxmiPlace', 'Inicia sesión para consultar y publicar opciones de vivienda en Ixmiquilpan.'],
    [/^\/register\/?$/, 'Crea tu cuenta | IxmiPlace', 'Crea una cuenta para publicar y guardar opciones de vivienda en IxmiPlace.'],
    [/^\/recuperar-contrasena\/?$/, 'Recuperar contraseña | IxmiPlace', 'Solicita un enlace para recuperar el acceso a tu cuenta de IxmiPlace.'],
    [/^\/verify-email\/?$/, 'Verifica tu correo | IxmiPlace', 'Confirma tu correo electrónico para completar el acceso a IxmiPlace.'],
    [/^\/complete-profile\/?$/, 'Completa tu perfil | IxmiPlace', 'Completa los datos necesarios para usar tu cuenta de IxmiPlace.'],
    [/^\/aviso-de-privacidad\/?$/, 'Aviso de privacidad | IxmiPlace', 'Conoce cómo IxmiPlace trata los datos personales y protege la información de sus usuarios.'],
    [/^\/terminos\/?$/, 'Términos y condiciones | IxmiPlace', 'Consulta las reglas para publicar y consultar opciones de vivienda en IxmiPlace.'],
    [/^\/apoyar\/?$/, 'Apoya IxmiPlace | Vivienda local en Ixmiquilpan', 'Conoce el proyecto IxmiPlace y cómo puedes apoyarlo de forma voluntaria.'],
    [/^\/propietario\/[^/]+\/?$/, 'Perfil público | IxmiPlace', 'Consulta el perfil público de una persona anunciante en IxmiPlace.'],
    [/^\/listing\/[^/]+\/?$/, 'Publicación de vivienda en Ixmiquilpan | IxmiPlace', 'Consulta los detalles de esta opción de renta, venta o hospedaje en Ixmiquilpan, Hidalgo.'],
    [/^\/roomies\/?$/, 'Espacios compartidos | IxmiPlace', 'Encuentra anuncios de espacios compartidos y personas que buscan roomie en Ixmiquilpan, Hidalgo.'],
  ];
  const matched = routeCopy.find(([pattern]) => pattern.test(path));
  const title = matched?.[1] ?? (path === '/' ? 'IxmiPlace | Vivienda local en Ixmiquilpan' : 'Página no encontrada | IxmiPlace');
  const description = matched?.[2] ?? DEFAULT_DESCRIPTION;
  usePageMeta(title, description, { noIndex: protectedRoute || path === '/' || !matched });
  return null;
}

export { SITE_ORIGIN };
