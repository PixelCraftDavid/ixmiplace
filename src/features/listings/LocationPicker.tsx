import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import type { LatLngLiteral, DragEndEvent, Marker as LeafletMarker } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Search, Loader2, MapPin, LocateFixed, Info } from 'lucide-react';

// 🔧 Fix: Leaflet no encuentra los iconos por defecto al usar Vite/Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Centro por defecto: Ixmiquilpan, Hidalgo
const DEFAULT_CENTER: LatLngLiteral = { lat: 20.4833, lng: -99.2167 };

interface GeocodeResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface LocationPickerProps {
  initialPosition?: LatLngLiteral;
  onChange: (position: LatLngLiteral) => void;
}

export function LocationPicker({ initialPosition, onChange }: LocationPickerProps) {
  const [position, setPosition] = useState<LatLngLiteral>(
    initialPosition ?? DEFAULT_CENTER
  );
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [locating, setLocating] = useState(false);

  // Notifica al formulario padre cada vez que cambia la posición
  useEffect(() => {
    onChange(position);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  // 🔧 Ya no es un onSubmit de <form>, es una función normal
  // que se llama desde el botón (onClick) y desde el input (onKeyDown → Enter)
  const handleSearch = useCallback(async () => {
    if (!query.trim() || searching) return;

    setSearching(true);
    setSearchError('');
    setResults([]);

    try {
      const params = new URLSearchParams({
        format: 'json',
        q: query,
        countrycodes: 'mx',
        limit: '5',
        viewbox: '-99.4,20.65,-99.0,20.3',
        bounded: '0',
      });

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`
      );
      if (!res.ok) throw new Error('Error de red');

      const data: GeocodeResult[] = await res.json();

      if (data.length === 0) {
        setSearchError('No se encontraron resultados. Intenta ser más específico.');
      } else {
        setResults(data);
      }
    } catch (err) {
      console.error('Error buscando dirección:', err);
      setSearchError('No se pudo buscar la dirección. Intenta de nuevo.');
    } finally {
      setSearching(false);
    }
  }, [query, searching]);

  // 🔧 Captura Enter en el input SIN enviar ningún <form>
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault(); // evita cualquier submit implícito del form padre
      e.stopPropagation(); // por seguridad extra, no deja que burbujee al form grande
      handleSearch();
    }
  }

  function selectResult(r: GeocodeResult) {
    setPosition({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) });
    setResults([]);
    setQuery(r.display_name);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setSearchError('Tu navegador no soporta geolocalización.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setSearchError('No se pudo obtener tu ubicación actual.');
        setLocating(false);
      }
    );
  }

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    const marker = e.target as LeafletMarker;
    const latLng = marker.getLatLng();
    setPosition({ lat: latLng.lat, lng: latLng.lng });
  }, []);

  return (
    <div className="space-y-3">
      {/* 🔧 Antes era <form onSubmit={handleSearch}>, ahora es un <div> normal */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Busca una calle, colonia o referencia…"
            className="w-full rounded-xl border border-cream-300 bg-cream-50 py-2.5 pl-9 pr-3
                       text-sm text-ink placeholder-ink-300 transition-all duration-200
                       focus:border-brand-500 focus:bg-white focus:outline-none
                       focus:ring-4 focus:ring-brand-500/15"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-sm
                     font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
        </button>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          aria-label="Usar mi ubicación actual"
          title="Usar mi ubicación actual"
          className="flex items-center justify-center rounded-xl border border-cream-300
                     bg-white px-3 text-ink-500 transition hover:bg-cream-100 disabled:opacity-60"
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LocateFixed className="h-4 w-4" />
          )}
        </button>
      </div>

      {searchError && <p className="text-xs text-red-600">{searchError}</p>}

      {/* Resultados de búsqueda */}
      {results.length > 0 && (
        <ul className="max-h-40 divide-y divide-cream-200 overflow-y-auto rounded-xl border border-cream-200 bg-white">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => selectResult(r)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm
                           text-ink-600 transition hover:bg-cream-100"
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-brand-500" />
                {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Mapa */}
      <div className="h-72 overflow-hidden rounded-xl border border-cream-300">
        <MapContainer
          center={position}
          zoom={initialPosition ? 16 : 14}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={position}
            draggable
            eventHandlers={{ dragend: handleDragEnd }}
          />
          <FlyToLocation position={position} />
        </MapContainer>
      </div>

      <p className="flex items-start gap-1.5 text-xs text-ink-400">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        Arrastra el pin para ajustar la ubicación exacta. Esta ubicación no se
        muestra públicamente, solo la colonia que escribiste arriba.
      </p>
    </div>
  );
}

function FlyToLocation({ position }: { position: LatLngLiteral }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(position, Math.max(map.getZoom(), 15));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position.lat, position.lng]);
  return null;
}