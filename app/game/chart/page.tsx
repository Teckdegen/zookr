'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/AppLayout'
import { SwordIcon } from '@/components/icons'

const ACCESS_CODE = 'Wonderfull002$'

export default function WarChartGate() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (code === ACCESS_CODE) {
      router.push('/game/chart/play')
    } else {
      setError('Invalid access code.')
      setCode('')
    }
  }

  return (
    <AppLayout active="play">
      <div className="min-h-[80vh] flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-8">
            <SwordIcon size={20} className="text-[#DC143C]" />
            <div>
              <p className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase">Private Access</p>
              <h1 className="font-serif text-3xl font-bold text-[#D4BF9A]">War Chart</h1>
            </div>
          </div>

          <div className="w-8 h-[2px] bg-[#DC143C] mb-8" />

          <p className="font-mono text-[10px] text-[#7A6E58] leading-relaxed mb-8">
            This game requires an access code. Contact the host to receive yours.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex items-center border border-[#2E2618] focus-within:border-[#DC143C] transition-colors">
              <span className="font-mono text-[#7A6E58] text-sm px-4 py-4 border-r border-[#2E2618]">⚔</span>
              <input
                type="password"
                className="bg-transparent text-[#D4BF9A] font-mono text-sm px-4 py-4 flex-1 outline-none placeholder:text-[#2E2618]"
                placeholder="Enter access code"
                value={code}
                onChange={(e) => { setCode(e.target.value); setError('') }}
                autoFocus
              />
            </div>
            {error && <p className="font-mono text-[10px] text-[#DC143C]">{error}</p>}
            <button className="btn-filled" type="submit" disabled={!code.trim()}>
              Enter
            </button>
          </form>

          <button onClick={() => router.back()}
            className="font-mono text-[9px] text-[#7A6E58] tracking-widest uppercase mt-6 hover:text-[#D4BF9A] transition-colors">
            ← Back
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
