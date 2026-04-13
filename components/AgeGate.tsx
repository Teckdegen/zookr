'use client'

import { useEffect, useState } from 'react'
import { SkullIcon } from '@/components/icons'

const STORAGE_KEY = 'zookr_age_accepted'

export function AgeGate() {
  const [accepted, setAccepted] = useState(true) // default true to avoid flash

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) setAccepted(false)
  }, [])

  if (accepted) return null

  function accept() {
    localStorage.setItem(STORAGE_KEY, '1')
    setAccepted(true)
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0A0806]">
      {/* Blood line top */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#DC143C] to-transparent" />

      <div className="w-full max-w-sm mx-6 flex flex-col items-center text-center">
        {/* Skull */}
        <SkullIcon size={48} className="text-[#DC143C] mb-8" />

        {/* Title */}
        <p className="font-mono text-[9px] tracking-[0.4em] text-[#7A6E58] uppercase mb-4">
          Before you enter Valhalla
        </p>
        <h2 className="font-serif text-4xl font-bold text-[#D4BF9A] mb-2">
          You must be
        </h2>
        <h2 className="font-serif text-6xl font-bold text-[#DC143C] italic mb-8">
          18+
        </h2>

        {/* Divider */}
        <div className="w-8 h-[2px] bg-[#DC143C] mb-8" />

        {/* Disclaimer */}
        <p className="text-[#7A6E58] text-xs leading-relaxed mb-10 max-w-xs">
          ZOOKR involves real financial risk with $DEAD and $UDEAD tokens on Base.
          Only use funds you can afford to lose entirely. This platform is for
          entertainment purposes only — past outcomes do not predict future results.
          Gambling can be addictive; seek help if needed.
        </p>

        {/* CTA */}
        <button
          onClick={accept}
          className="btn-blood w-full py-4 text-sm tracking-widest mb-4"
        >
          I AM 18+ AND I UNDERSTAND THE RISKS
        </button>
        <p className="font-mono text-[9px] text-[#7A6E58] tracking-wider">
          By entering you confirm you are of legal age in your jurisdiction.
        </p>
      </div>

      {/* Blood line bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#DC143C] to-transparent" />
    </div>
  )
}
