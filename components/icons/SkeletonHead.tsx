// Detailed skeleton head — used as avatar placeholders and decorative elements
export function SkeletonHead({
  size = 40,
  className = '',
  variant = 'default',
}: {
  size?: number
  className?: string
  variant?: 'default' | 'cracked' | 'crown'
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Crown for host */}
      {variant === 'crown' && (
        <path
          d="M20 16L28 8l12 10L52 8l8 8-4 6H24l-4-6z"
          fill="currentColor"
          fillOpacity="0.6"
          stroke="currentColor"
          strokeWidth="1"
        />
      )}

      {/* Skull cranium */}
      <path
        d="M40 10C24.536 10 12 22.536 12 38c0 9.941 5.107 18.68 12.8 23.75V68a2 2 0 002 2h26.4a2 2 0 002-2v-6.25C62.893 56.68 68 47.941 68 38 68 22.536 55.464 10 40 10z"
        fill="currentColor"
        fillOpacity="0.08"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      {/* Crack (cracked variant) */}
      {variant === 'cracked' && (
        <path
          d="M40 10l2 8-3 4 4 6-2 10"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fillOpacity="0.4"
        />
      )}

      {/* Eye sockets */}
      <ellipse cx="28" cy="36" rx="7" ry="8" fill="currentColor" />
      <ellipse cx="52" cy="36" rx="7" ry="8" fill="currentColor" />

      {/* Eye glow — inner highlight */}
      <ellipse cx="26" cy="34" rx="2" ry="2.5" fill="currentColor" fillOpacity="0.3" />
      <ellipse cx="50" cy="34" rx="2" ry="2.5" fill="currentColor" fillOpacity="0.3" />

      {/* Nose cavity */}
      <path d="M37 46l3-5 3 5h-6z" fill="currentColor" />

      {/* Cheekbone lines */}
      <path d="M18 44 Q22 48 24 46" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M62 44 Q58 48 56 46" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />

      {/* Jaw */}
      <path d="M22 58 Q40 65 58 58" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />

      {/* Teeth */}
      <rect x="26" y="60" width="5" height="6" rx="1" fill="currentColor" />
      <rect x="33" y="60" width="5" height="7" rx="1" fill="currentColor" />
      <rect x="40" y="60" width="5" height="7" rx="1" fill="currentColor" />
      <rect x="47" y="60" width="5" height="6" rx="1" fill="currentColor" />
    </svg>
  )
}
