export function DiceIcon({ size = 24, value = 1, className = '' }: { size?: number; value?: number; className?: string }) {
  const dots: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
  }

  const positions = dots[value] || dots[1]

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Skull motif corners */}
      <rect x="4" y="4" width="92" height="92" rx="12" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="2" />
      {/* Dots */}
      {positions.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="8" fill="currentColor" />
      ))}
    </svg>
  )
}
