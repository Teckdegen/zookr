export function SwordIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Blade */}
      <path
        d="M48 4L16 36l4 4L52 8z"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Blade edge */}
      <line x1="50" y1="6" x2="18" y2="38" stroke="currentColor" strokeWidth="2" />
      {/* Crossguard */}
      <line x1="12" y1="32" x2="24" y2="44" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {/* Handle */}
      <path d="M20 40l-8 8-4 2 2-4 8-8 2 2z" fill="currentColor" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}
