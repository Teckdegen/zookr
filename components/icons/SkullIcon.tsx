export function SkullIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M32 4C18.745 4 8 14.745 8 28c0 8.284 4.284 15.567 10.75 19.875V52a2 2 0 002 2h22.5a2 2 0 002-2v-4.125C51.716 43.567 56 36.284 56 28 56 14.745 45.255 4 32 4z"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Eye sockets */}
      <ellipse cx="22" cy="28" rx="6" ry="7" fill="currentColor" />
      <ellipse cx="42" cy="28" rx="6" ry="7" fill="currentColor" />
      {/* Nose */}
      <path d="M30 36l2-4 2 4h-4z" fill="currentColor" />
      {/* Teeth */}
      <rect x="20" y="52" width="4" height="4" rx="0.5" fill="currentColor" />
      <rect x="26" y="52" width="4" height="4" rx="0.5" fill="currentColor" />
      <rect x="32" y="52" width="4" height="4" rx="0.5" fill="currentColor" />
      <rect x="38" y="52" width="4" height="4" rx="0.5" fill="currentColor" />
      {/* Jaw line */}
      <path d="M18 50h28" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}
