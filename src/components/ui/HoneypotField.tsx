interface HoneypotFieldProps {
  value: string;
  onChange: (value: string) => void;
}

/** Lightweight bot trap; server-side auth and rate limits remain the real controls. */
export function HoneypotField({ value, onChange }: HoneypotFieldProps) {
  return (
    <label aria-hidden="true" className="fixed -left-[10000px] top-auto h-px w-px overflow-hidden">
      No llenes este campo
      <input
        name="website"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        tabIndex={-1}
      />
    </label>
  );
}
