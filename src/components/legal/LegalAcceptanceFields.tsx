import { Link } from 'react-router-dom';

interface LegalAcceptanceFieldsProps {
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  onTermsChange: (accepted: boolean) => void;
  onPrivacyChange: (accepted: boolean) => void;
}

export function LegalAcceptanceFields({
  acceptedTerms,
  acceptedPrivacy,
  onTermsChange,
  onPrivacyChange,
}: LegalAcceptanceFieldsProps) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-cream-200 bg-cream-50 p-4 text-sm leading-relaxed text-ink-600 dark:border-[#4b5847] dark:bg-[#242b22] dark:text-ink-200">
      <legend className="px-1 text-xs font-semibold text-ink-500 dark:text-ink-300">Antes de continuar</legend>
      <label className="flex items-start gap-2.5">
        <input
          type="checkbox"
          required
          checked={acceptedTerms}
          onChange={(event) => onTermsChange(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-brand-600"
        />
        <span>
          Acepto los <Link to="/terminos" target="_blank" className="font-semibold text-brand-700 underline dark:text-brand-300">Términos y Condiciones</Link> de IxmiPlace.
        </span>
      </label>
      <label className="flex items-start gap-2.5">
        <input
          type="checkbox"
          required
          checked={acceptedPrivacy}
          onChange={(event) => onPrivacyChange(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-brand-600"
        />
        <span>
          Leí el <Link to="/aviso-de-privacidad" target="_blank" className="font-semibold text-brand-700 underline dark:text-brand-300">Aviso de Privacidad</Link> y consiento el tratamiento de mis datos para operar mi cuenta y las funciones que solicite.
        </span>
      </label>
    </fieldset>
  );
}
