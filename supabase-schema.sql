-- ZOOKR Supabase Schema
-- Run this in your Supabase SQL editor

-- Users
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  wallet_address text unique not null,
  username text unique not null,
  created_at timestamptz default now()
);

-- Win sequences (server-side only — never expose to client)
create table if not exists win_sequences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade unique,
  sequence text not null,
  current_index integer default 0,
  deposit_tier numeric default 1,
  total_games integer default 0,
  updated_at timestamptz default now()
);

-- Game sessions (solo)
create table if not exists game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  game_type text not null check (game_type in ('expert_option', 'dead_price')),
  token text not null check (token in ('DEAD', 'UDEAD')),
  bet_amount numeric not null,
  bet_amount_usd numeric default 0,
  sequence_outcome text check (sequence_outcome in ('win', 'loss')),
  bet_tx_hash text,
  payout_tx_hash text,
  result text not null default 'pending' check (result in ('pending', 'win', 'loss')),
  payout numeric default 0,
  status text not null default 'pending' check (status in ('pending', 'complete')),
  created_at timestamptz default now()
);

-- Rooms
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  host_user_id uuid references users(id),
  game_mode text not null check (game_mode in ('dice', 'flash_price')),
  status text default 'waiting' check (status in ('waiting', 'active', 'closed')),
  max_players integer check (max_players in (2, 4, 6)),
  stake_amount numeric not null,
  created_at timestamptz default now()
);

-- Room members
create table if not exists room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  user_id uuid references users(id),
  username text not null,
  joined_at timestamptz default now(),
  unique(room_id, user_id)
);

-- Room rounds
create table if not exists room_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  game_type text not null,
  stake_amount numeric not null,
  player_count integer not null,
  status text default 'waiting' check (status in ('waiting', 'playing', 'complete')),
  winner_id uuid references users(id),
  pot_total numeric not null,
  winner_payout numeric not null,
  created_at timestamptz default now()
);

-- Room round entries
create table if not exists room_round_entries (
  id uuid primary key default gen_random_uuid(),
  round_id uuid references room_rounds(id) on delete cascade,
  user_id uuid references users(id),
  pick text not null,
  result text default 'pending' check (result in ('pending', 'win', 'loss')),
  created_at timestamptz default now(),
  unique(round_id, user_id)
);

-- Transactions
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  type text not null check (type in ('bet', 'win', 'room_win', 'room_loss')),
  token text not null check (token in ('DEAD', 'UDEAD')),
  amount numeric not null,
  tx_hash text,
  created_at timestamptz default now()
);

-- RLS Policies
alter table users enable row level security;
alter table win_sequences enable row level security;
alter table game_sessions enable row level security;
alter table rooms enable row level security;
alter table room_members enable row level security;
alter table room_rounds enable row level security;
alter table room_round_entries enable row level security;
alter table transactions enable row level security;

create policy "users_read_own"   on users for select using (true);
create policy "users_insert_own" on users for insert with check (true);

create policy "rooms_read_all"    on rooms for select using (true);
create policy "rooms_insert_auth" on rooms for insert with check (true);
create policy "rooms_update_host" on rooms for update using (true);

create policy "room_members_read"   on room_members for select using (true);
create policy "room_members_insert" on room_members for insert with check (true);

create policy "room_rounds_read" on room_rounds for select using (true);

create policy "game_sessions_read" on game_sessions for select using (true);
create policy "transactions_read"  on transactions  for select using (true);

-- Win sequences — NEVER readable by client (no anon select policy)

-- Enable Realtime on rooms and room_members
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table room_members;
