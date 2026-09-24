import { Link } from 'react-router-dom';
import { MapPin, MessageCircle, Bed, Bath } from 'lucide-react';
import { whatsappLink, formatPrice, availabilityColor } from '../../lib/utils';
import {
  categoryEmoji,
  priceUnitLabel,
  availabilityMeta,
} from '../../lib/constants';
import { optimizedUrl } from '../../lib/cloudinary';
import { FavoriteButton } from '../favorites/FavoriteButton';
import type { Listing } from '../../types/models';
import { trackListingMetric } from '../../lib/listing-metrics';

interface Props {
  listing: Listing;
}

export function ListingCard({ listing }: Props) {
  const meta = availabilityMeta(listing.availability);
  const cover = optimizedUrl(listing.photos[0], 800, 600);

  const wa = whatsappLink(
    listing.whatsapp,
    `Hola, vi tu anuncio "${listing.title}" en IxmiPlace. ¿Sigue disponible?`
  );

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-cream-200
                        bg-white shadow-sm transition-all duration-300
                        hover:-translate-y-1 hover:border-secondary-300 hover:shadow-xl">
      <Link to={`/listing/${listing.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-cream-200">
          {listing.photos.length > 0 ? (
            <img
              src={cover}
              alt={listing.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500
                         group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-ink-400">
              Sin imagen
            </div>
          )}

          {/* ⭐ Botón de favoritos */}
          <FavoriteButton listingId={listing.id} />

          {/* Badge disponibilidad */}
          <span
            className={`absolute left-3 top-3 flex items-center gap-1.5
                        rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-md
                        shadow-sm ${meta.bg}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${availabilityColor(
                listing.availability
              )}`}
            />
            {meta.label}
          </span>

          {/* Badge de categoría */}
          <span
            className="absolute right-3 top-16 rounded-full bg-ink/60 px-2.5 py-1
                       text-xs font-medium text-white backdrop-blur-md"
          >
            {categoryEmoji(listing.category)} {listing.operation}
          </span>
        </div>
      </Link>

      {/* Resto igual... */}
      <div className="space-y-3 p-4">
        <Link to={`/listing/${listing.id}`}>
          <h3 className="line-clamp-1 font-semibold text-ink transition hover:text-brand-600">
            {listing.title}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-ink-400">
            <MapPin className="h-3 w-3" />
            {listing.colonia}, Ixmiquilpan
          </p>
        </Link>

        <div className="flex items-baseline justify-between border-t border-cream-200 pt-3">
          <p className="text-xl font-extrabold text-brand-600">
            {formatPrice(listing.price)}
            <span className="ml-1 text-xs font-normal text-ink-400">
              {priceUnitLabel(listing.priceUnit)}
            </span>
          </p>
        </div>

        {(listing.bedrooms || listing.bathrooms) && (
          <div className="flex gap-3 text-xs text-ink-500">
            {listing.bedrooms ? (
              <span className="flex items-center gap-1">
                <Bed className="h-3.5 w-3.5" />
                {listing.bedrooms} rec.
              </span>
            ) : null}
            {listing.bathrooms ? (
              <span className="flex items-center gap-1">
                <Bath className="h-3.5 w-3.5" />
                {listing.bathrooms} baños
              </span>
            ) : null}
          </div>
        )}

        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={() => trackListingMetric(listing.id, 'whatsappContactsCount')}
          className="flex w-full items-center justify-center gap-2 rounded-xl
                     bg-gradient-to-r from-green-500 to-green-600 py-2.5
                     text-sm font-semibold text-white shadow-md
                     shadow-green-500/25 transition
                     hover:shadow-lg hover:shadow-green-500/40 hover:brightness-110"
        >
          <MessageCircle className="h-4 w-4" />
          Contactar
        </a>
      </div>
    </article>
  );
}