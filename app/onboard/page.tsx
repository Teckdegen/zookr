'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function OnboardPage() {
  const { address } = useAccount()
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!address) return
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (clean.length < 3) {
      setError('Min 3 characters. Letters, numbers, underscores only.')
      return
    }

    setLoading(true)
    setError('')

    // Check if username is taken
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', clean)
      .single()

    if (existing) {
      setError('That name is taken. Choose another.')
      setLoading(false)
      return
    }

    // Create user
    const { error: insertErr } = await supabase.from('users').insert({
      wallet_address: address.toLowerCase(),
      username: clean,
    })

    if (insertErr) {
      setError('Something went wrong. Try again.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen bg-[#0A0806] flex items-center justify-center px-6 md:pt-14">
      <div className="w-full max-w-sm">
        <p className="font-mono text-[10px] tracking-[0.3em] text-[#7A6E58] uppercase mb-6">
          ☠ ZOOKR
        </p>

        <h1 className="font-serif text-5xl font-bold text-[#D4BF9A] mb-2">
          Pick your name,
        </h1>
        <h1 className="font-serif text-5xl font-bold italic text-[#DC143C] mb-8">
          warrior.
        </h1>

        <div className="w-8 h-[2px] bg-[#DC143C] mb-8" />

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <div className="flex items-center border border-[#2E2618] focus-within:border-[#DC143C] transition-colors">
              <span className="font-mono text-[#7A6E58] text-sm px-4 py-4 border-r border-[#2E2618]">
                @
              </span>
              <input
                className="bg-transparent text-[#D4BF9A] font-mono text-sm px-4 py-4 flex-1 outline-none placeholder:text-[#7A6E58]"
                placeholder="yourname"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
                autoFocus
              />
            </div>
            {error && (
              <p className="font-mono text-[10px] text-[#DC143C] tracking-wide mt-2">
                {error}
              </p>
            )}
          </div>

          <button className="btn-filled" type="submit" disabled={loading || !username.trim()}>
            {loading ? 'Entering...' : "Let's Go"}
          </button>
        </form>

        <p className="font-mono text-[10px] text-[#7A6E58] tracking-wide mt-6">
          This name appears in War Rooms and your activity. You can change it after 30 days.
        </p>
      </div>
    </main>
  )
}
