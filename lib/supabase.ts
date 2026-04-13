import { createClient } from '@supabase/supabase-js'

// Use fallback placeholder so createClient doesn't throw during SSR prerendering.
// All actual calls happen inside useEffect (client-only), so real values are always present.
const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL     || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          wallet_address: string
          username: string
          created_at: string
        }
        Insert: {
          wallet_address: string
          username: string
        }
      }
      win_sequences: {
        Row: {
          id: string
          user_id: string
          sequence: string
          current_index: number
          deposit_tier: number
          total_games: number
        }
      }
      game_sessions: {
        Row: {
          id: string
          user_id: string
          game_type: 'expert_option' | 'dead_price'
          token: 'DEAD' | 'UDEAD'
          bet_amount: number
          bet_amount_usd: number
          sequence_outcome: 'win' | 'loss'
          bet_tx_hash: string | null
          payout_tx_hash: string | null
          result: 'pending' | 'win' | 'loss'
          payout: number
          status: 'pending' | 'complete'
          created_at: string
        }
      }
      rooms: {
        Row: {
          id: string
          name: string
          code: string
          host_user_id: string
          game_mode: 'dice' | 'flash_price'
          status: 'waiting' | 'active' | 'closed'
          max_players: number
          stake_amount: number
          created_at: string
        }
      }
      room_members: {
        Row: {
          id: string
          room_id: string
          user_id: string
          username: string
          joined_at: string
        }
      }
      room_rounds: {
        Row: {
          id: string
          room_id: string
          game_type: 'dice' | 'flash_price'
          stake_amount: number
          player_count: number
          status: 'waiting' | 'playing' | 'complete'
          winner_id: string | null
          pot_total: number
          winner_payout: number
          created_at: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          type: 'bet' | 'win' | 'room_win' | 'room_loss'
          token: 'DEAD' | 'UDEAD'
          amount: number
          tx_hash: string | null
          created_at: string
        }
      }
    }
  }
}
