'use client'

// Skeleton loading state for the candle chart — skull-themed placeholder bars
export function SkeletonChart() {
  const bars = [0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.3, 0.75, 0.55, 0.85, 0.45, 0.65, 0.9, 0.5, 0.7]

  return (
    <div className="w-full h-[180px] flex items-end gap-[3px] px-2 pb-2">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 flex flex-col items-center gap-[2px]"
          style={{ height: '100%', justifyContent: 'flex-end' }}
        >
          {/* Wick top */}
          <div
            className="w-[1px] bg-[#2E2618] animate-pulse"
            style={{ height: `${h * 30}%` }}
          />
          {/* Body */}
          <div
            className="w-full bg-[#2E2618] animate-pulse rounded-sm"
            style={{
              height: `${h * 60}%`,
              animationDelay: `${i * 0.07}s`,
            }}
          />
          {/* Wick bottom */}
          <div
            className="w-[1px] bg-[#2E2618] animate-pulse"
            style={{ height: `${(1 - h) * 15}%` }}
          />
        </div>
      ))}
    </div>
  )
}

// Skeleton for price display
export function SkeletonPrice() {
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      <div className="h-3 w-20 bg-[#2E2618] rounded" />
      <div className="h-7 w-36 bg-[#2E2618] rounded" />
    </div>
  )
}

// Skeleton for balance
export function SkeletonBalance() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      <div className="h-2 w-16 bg-[#2E2618]" />
      <div className="h-10 w-32 bg-[#2E2618]" />
      <div className="h-6 w-24 bg-[#2E2618]" />
    </div>
  )
}

// Skeleton for room cards
export function SkeletonRoomCard() {
  return (
    <div className="bg-[#1E1B14] px-6 py-4 flex justify-between items-center animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-[#2E2618]" />
        <div className="h-3 w-24 bg-[#2E2618]" />
      </div>
      <div className="h-3 w-16 bg-[#2E2618]" />
    </div>
  )
}
