import { useState } from 'react';
import { Loader2, MessageCircle } from 'lucide-react';
import { requestListingWhatsApp } from '../../lib/listing-contact';

export function WhatsAppContactButton({
  listingId,
  className,
  label = 'Contactar por WhatsApp',
  iconOnly = false,
}: {
  listingId: string;
  className: string;
  label?: string;
  iconOnly?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleContact() {
    if (loading) return;
    setLoading(true);
    setError('');

    // Open synchronously within the user gesture so browsers do not block it.
    const popup = window.open('about:blank', '_blank');
    if (popup) popup.opener = null;

    try {
      const url = await requestListingWhatsApp(listingId);
      if (popup && !popup.closed) popup.location.replace(url);
      else window.location.assign(url);
    } catch (contactError) {
      popup?.close();
      setError(contactError instanceof Error ? contactError.message : 'No se pudo consultar el contacto.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => void handleContact()}
        disabled={loading}
        aria-label={label}
        className={`${className} disabled:cursor-wait disabled:opacity-70`}
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
        {!iconOnly && (loading ? 'Validando acceso…' : label)}
      </button>
      {error && <p role="alert" className="mt-2 text-center text-xs text-red-600">{error}</p>}
    </div>
  );
}
