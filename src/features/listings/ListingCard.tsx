import { Link } from 'react-router-dom';
import { Bath, Bed, MapPin, Ruler } from 'lucide-react';
import { formatPrice, availabilityColor } from '../../lib/utils';
import {
  categoryEmoji,
  priceUnitLabel,
  availabilityMeta,
} from '../../lib/constants';
import { optimizedUrl } from '../../lib/cloudinary';
import { FavoriteButton } from '../favorites/FavoriteButton';
import type { Listing } from '../../types/models';
import { WhatsAppContactButton } from './WhatsAppContactButton';

interface Props {
  listing: Listing;
}

export function ListingCard({ listing }: Props) {
  const meta = availabilityMeta(listing.availability);
  const cover = optimizedUrl(listing.photos[0], 800, 600);

  return (
    <article className="listing-card motion-ease group overflow-hidden rounded-2xl border border-ink-700/10 bg-white shadow-[0_2px_12px_rgba(27,32,24,0.045)] transition duration-300 hover:-translate-y-1 hover:border-brand-300/70 hover:shadow-[0_16px_36px_rgba(27,32,24,0.12)] dark:border-white/10 dark:bg-[#242a22]">
      <div className="relative aspect-[4/3] overflow-hidden bg-cream-200 dark:bg-ink-600">
        <Link to={`/listing/${listing.id}`} className="block h-full" aria-label={`Ver ${listing.title}`}>
          {listing.photos.length > 0 ? (
            <img
              src={cover}
              alt={listing.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-ink-400">
              Sin imagen disponible
            </div>
          )}
        </Link>

        <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-sm backdrop-blur-sm dark:border-white/15 dark:bg-[#20251f]/95 dark:text-white">
          <span className={`h-2 w-2 rounded-full ${availabilityColor(listing.availability)}`} />
          {meta.label}
        </span>
        <FavoriteButton listingId={listing.id} />

        <span className="absolute bottom-3 left-3 rounded-lg border border-white/20 bg-ink-900/75 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
          {categoryEmoji(listing.category)} <span className="capitalize">{listing.operation}</span>
        </span>
      </div>

      <div className="p-4 sm:p-5">
        <Link to={`/listing/${listing.id}`} className="block rounded-sm focus-visible:outline-none">
          <h3 className="line-clamp-2 min-h-[3.25rem] text-[15px] font-semibold leading-[1.55] tracking-[-0.015em] text-ink-800 transition-colors duration-200 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-200">
            {listing.title}
          </h3>
          <p className="mt-2 flex items-center gap-1.5 truncate text-xs text-ink-500 dark:text-ink-300">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-600 dark:text-brand-300" aria-hidden="true" />
            <span className="truncate">{listing.colonia}, Ixmiquilpan</span>
          </p>
        </Link>

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-ink-700/10 pt-4 dark:border-white/10">
          <p className="text-xl font-semibold tracking-tight text-brand-700 dark:text-brand-200">
            {formatPrice(listing.price)}
            <span className="ml-1.5 text-xs font-medium tracking-normal text-ink-500 dark:text-ink-300">
              {priceUnitLabel(listing.priceUnit)}
            </span>
          </p>
          <div className="flex items-center gap-3 pb-0.5 text-xs text-ink-500 dark:text-ink-300">
            {listing.bedrooms ? (
              <span className="inline-flex items-center gap-1" title={`${listing.bedrooms} recámaras`}>
                <Bed className="h-3.5 w-3.5" aria-hidden="true" />{listing.bedrooms}
              </span>
            ) : null}
            {listing.bathrooms ? (
              <span className="inline-flex items-center gap-1" title={`${listing.bathrooms} baños`}>
                <Bath className="h-3.5 w-3.5" aria-hidden="true" />{listing.bathrooms}
              </span>
            ) : null}
            {listing.areaM2 ? (
              <span className="inline-flex items-center gap-1" title={`${listing.areaM2} metros cuadrados`}>
                <Ruler className="h-3.5 w-3.5" aria-hidden="true" />{listing.areaM2}
              </span>
            ) : null}
          </div>
        </div>

        <WhatsAppContactButton
          listingId={listing.id}
          className="motion-ease mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#365b43] px-4 py-2.5 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#2f503b] active:translate-y-0 dark:bg-[#587b5e] dark:hover:bg-[#66896b]"
          label="Contactar por WhatsApp"
        />
      </div>
    </article>
  );
}
