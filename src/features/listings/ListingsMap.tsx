import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngLiteral } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { formatPrice } from '../../lib/utils';
import { categoryEmoji, priceUnitLabel } from '../../lib/constants';
import type { Listing } from '../../types/models';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER: LatLngLiteral = { lat: 20.4833, lng: -99.2167 };

interface ListingsMapProps {
  listings: Listing[];
}

export function ListingsMap({ listings }: ListingsMapProps) {
  const mappedListings = listings.filter(
    (listing) => Number.isFinite(listing.lat) && Number.isFinite(listing.lng)
  );
  const center = getCenter(mappedListings);
  const bounds = getBounds(mappedListings);

  return (
    <div className="overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-cream-200 px-4 py-3">
        <div>
          <h3 className="font-bold text-ink">Propiedades en el mapa</h3>
          <p className="mt-0.5 text-xs text-ink-400">
            {mappedListings.length} {mappedListings.length === 1 ? 'ubicación' : 'ubicaciones'} disponibles
          </p>
        </div>
        <MapPin className="h-5 w-5 text-brand-500" />
      </div>

      {mappedListings.length === 0 ? (
        <div className="flex h-72 items-center justify-center px-6 text-center text-sm text-ink-500">
          Las propiedades de este resultado todavía no tienen una ubicación en el mapa.
        </div>
      ) : (
        <div className="h-[28rem]">
          <MapContainer
            center={center}
            zoom={13}
            bounds={bounds}
            scrollWheelZoom
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mappedListings.map((listing) => (
              <Marker
                key={listing.id}
                position={{ lat: listing.lat!, lng: listing.lng! }}
              >
                <Popup>
                  <div className="min-w-44">
                    {listing.photos[0] && (
                      <img
                        src={listing.photos[0]}
                        alt=""
                        className="mb-2 h-20 w-full rounded-lg object-cover"
                      />
                    )}
                    <p className="text-xs text-ink-400">
                      {categoryEmoji(listing.category)} {listing.colonia}
                    </p>
                    <h4 className="mt-1 font-bold text-ink">{listing.title}</h4>
                    <p className="mt-1 font-semibold text-brand-600">
                      {formatPrice(listing.price)} {priceUnitLabel(listing.priceUnit)}
                    </p>
                    <Link
                      to={`/listing/${listing.id}`}
                      className="mt-3 inline-flex rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
                    >
                      Ver propiedad
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}

function getCenter(listings: Listing[]): LatLngLiteral {
  if (listings.length === 0) return DEFAULT_CENTER;

  return {
    lat: listings.reduce((sum, listing) => sum + listing.lat!, 0) / listings.length,
    lng: listings.reduce((sum, listing) => sum + listing.lng!, 0) / listings.length,
  };
}

function getBounds(listings: Listing[]): LatLngBoundsExpression | undefined {
  if (listings.length === 0) return undefined;
  return listings.map((listing) => [listing.lat!, listing.lng!] as [number, number]);
}