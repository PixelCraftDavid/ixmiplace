interface HouseLoaderProps {
  variant?: 'building' | 'line' | 'bounce';
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: { container: 'h-24 w-24', text: 'text-xs' },
  md: { container: 'h-40 w-40', text: 'text-sm' },
  lg: { container: 'h-56 w-56', text: 'text-base' },
};

export function HouseLoader({
  variant = 'line',
  message,
  size = 'md',
  className = '',
}: HouseLoaderProps) {
  const s = sizeMap[size];

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 ${className}`}
    >
      <div className={`${s.container} relative`}>
        {variant === 'line' && <LineHouse />}
        {variant === 'building' && <BuildingHouse />}
        {variant === 'bounce' && <BounceHouse />}
      </div>

      {message && (
        <p className={`${s.text} font-medium text-gray-500 animate-pulse`}>
          {message}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Variante 1 — Casa dibujándose con línea (SVG stroke)
// ─────────────────────────────────────────────────────────
function LineHouse() {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      className="h-full w-full"
      aria-hidden="true"
    >
      {/* Silueta de la casa — se dibuja con animación */}
      <path
        d="M 20 90 L 20 45 L 50 20 L 80 45 L 80 90 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-brand-600"
        style={{
          strokeDasharray: 300,
          strokeDashoffset: 300,
          animation: 'drawLine 1.8s ease-out forwards',
        }}
      />
      {/* Puerta */}
      <path
        d="M 42 90 L 42 65 L 58 65 L 58 90"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-brand-600"
        style={{
          strokeDasharray: 70,
          strokeDashoffset: 70,
          animation: 'drawLine 0.7s ease-out 1s forwards',
        }}
      />
      {/* Ventana izquierda */}
      <rect
        x="26"
        y="55"
        width="8"
        height="8"
        stroke="currentColor"
        strokeWidth="2"
        className="text-brand-600"
        style={{
          opacity: 0,
          animation: 'fadeIn 0.4s ease-out 1.5s forwards',
        }}
      />
      {/* Ventana derecha */}
      <rect
        x="66"
        y="55"
        width="8"
        height="8"
        stroke="currentColor"
        strokeWidth="2"
        className="text-brand-600"
        style={{
          opacity: 0,
          animation: 'fadeIn 0.4s ease-out 1.6s forwards',
        }}
      />

      <style>{`
        @keyframes drawLine {
          to { stroke-dashoffset: 0; }
        }
        @keyframes fadeIn {
          to { opacity: 1; }
        }
      `}</style>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// Variante 2 — Casa construyéndose por partes
// ─────────────────────────────────────────────────────────
function BuildingHouse() {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      className="h-full w-full"
      aria-hidden="true"
    >
      {/* Suelo — aparece primero */}
      <line
        x1="10"
        y1="90"
        x2="90"
        y2="90"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="text-brand-700"
        style={{
          strokeDasharray: 80,
          strokeDashoffset: 80,
          animation: 'drawLine 0.4s ease-out forwards',
        }}
      />

      {/* Base de la casa — sube desde el suelo */}
      <rect
        x="25"
        y="45"
        width="50"
        height="45"
        fill="currentColor"
        className="text-brand-100"
        style={{
          transformOrigin: '50px 90px',
          transform: 'scaleY(0)',
          animation: 'growUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s forwards',
        }}
      />

      {/* Contorno de la base */}
      <rect
        x="25"
        y="45"
        width="50"
        height="45"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        className="text-brand-600"
        style={{
          opacity: 0,
          animation: 'fadeIn 0.3s ease-out 1.1s forwards',
        }}
      />

      {/* Techo — baja desde arriba */}
      <path
        d="M 15 45 L 50 15 L 85 45 Z"
        fill="currentColor"
        className="text-brand-500"
        style={{
          transformOrigin: '50px 15px',
          transform: 'scaleY(0)',
          animation: 'growDown 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 1.2s forwards',
        }}
      />

      {/* Puerta */}
      <rect
        x="43"
        y="65"
        width="14"
        height="25"
        fill="currentColor"
        className="text-brand-700"
        style={{
          opacity: 0,
          animation: 'fadeIn 0.4s ease-out 1.9s forwards',
        }}
      />
      {/* Perilla de la puerta */}
      <circle
        cx="53"
        cy="77"
        r="1.2"
        fill="#fbbf24"
        style={{
          opacity: 0,
          animation: 'fadeIn 0.3s ease-out 2.3s forwards',
        }}
      />

      {/* Ventanas — se "prenden" */}
      <rect
        x="30"
        y="55"
        width="10"
        height="10"
        fill="currentColor"
        className="text-yellow-300"
        style={{
          opacity: 0,
          animation: 'windowLight 0.5s ease-out 2.1s forwards',
        }}
      />
      <rect
        x="60"
        y="55"
        width="10"
        height="10"
        fill="currentColor"
        className="text-yellow-300"
        style={{
          opacity: 0,
          animation: 'windowLight 0.5s ease-out 2.3s forwards',
        }}
      />

      {/* Chimenea */}
      <rect
        x="68"
        y="22"
        width="6"
        height="12"
        fill="currentColor"
        className="text-brand-700"
        style={{
          opacity: 0,
          animation: 'fadeIn 0.3s ease-out 1.7s forwards',
        }}
      />

      {/* Humo animado (loop infinito) */}
      <g
        style={{
          opacity: 0,
          animation: 'fadeIn 0.5s ease-out 2.5s forwards',
        }}
      >
        <circle
          cx="71"
          cy="14"
          r="2.5"
          fill="currentColor"
          className="text-gray-400"
          style={{
            transformOrigin: '71px 14px',
            animation: 'smoke1 2.5s ease-in-out infinite',
          }}
        />
        <circle
          cx="71"
          cy="10"
          r="2"
          fill="currentColor"
          className="text-gray-300"
          style={{
            transformOrigin: '71px 10px',
            animation: 'smoke2 2.5s ease-in-out 0.8s infinite',
          }}
        />
        <circle
          cx="71"
          cy="6"
          r="1.5"
          fill="currentColor"
          className="text-gray-200"
          style={{
            transformOrigin: '71px 6px',
            animation: 'smoke3 2.5s ease-in-out 1.6s infinite',
          }}
        />
      </g>

      <style>{`
        @keyframes drawLine {
          to { stroke-dashoffset: 0; }
        }
        @keyframes fadeIn {
          to { opacity: 1; }
        }
        @keyframes growUp {
          to { transform: scaleY(1); }
        }
        @keyframes growDown {
          to { transform: scaleY(1); }
        }
        @keyframes windowLight {
          0%   { opacity: 0; }
          60%  { opacity: 1; }
          75%  { opacity: 0.6; }
          100% { opacity: 1; }
        }
        @keyframes smoke1 {
          0%   { transform: translateY(0) scale(1);   opacity: 0.8; }
          100% { transform: translateY(-15px) scale(2); opacity: 0; }
        }
        @keyframes smoke2 {
          0%   { transform: translateY(0) scale(1);   opacity: 0.6; }
          100% { transform: translateY(-18px) scale(2.2); opacity: 0; }
        }
        @keyframes smoke3 {
          0%   { transform: translateY(0) scale(1);   opacity: 0.4; }
          100% { transform: translateY(-20px) scale(2.5); opacity: 0; }
        }
      `}</style>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// Variante 3 — Casa rebotando con anillo de progreso
// ─────────────────────────────────────────────────────────
function BounceHouse() {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      className="h-full w-full"
      aria-hidden="true"
    >
      {/* Anillo girando alrededor */}
      <circle
        cx="50"
        cy="50"
        r="42"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="60 200"
        strokeLinecap="round"
        className="text-brand-500"
        style={{
          transformOrigin: '50px 50px',
          animation: 'spin 1.6s linear infinite',
        }}
      />
      <circle
        cx="50"
        cy="50"
        r="42"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.15"
        className="text-brand-300"
      />

      {/* Casa central — rebota */}
      <g
        style={{
          transformOrigin: '50px 60px',
          animation: 'bounce 1.2s ease-in-out infinite',
        }}
      >
        {/* Base */}
        <rect
          x="28"
          y="45"
          width="44"
          height="35"
          fill="currentColor"
          className="text-brand-100"
        />
        <rect
          x="28"
          y="45"
          width="44"
          height="35"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-brand-600"
        />
        {/* Techo */}
        <path
          d="M 22 45 L 50 20 L 78 45 Z"
          fill="currentColor"
          className="text-brand-500"
        />
        {/* Puerta */}
        <rect
          x="44"
          y="62"
          width="12"
          height="18"
          fill="currentColor"
          className="text-brand-700"
        />
        {/* Ventana */}
        <rect
          x="33"
          y="52"
          width="7"
          height="7"
          fill="currentColor"
          className="text-yellow-300"
        />
        <rect
          x="60"
          y="52"
          width="7"
          height="7"
          fill="currentColor"
          className="text-yellow-300"
        />
      </g>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
      `}</style>
    </svg>
  );
}