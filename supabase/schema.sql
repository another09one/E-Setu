-- Kabadiwala Connect — SIH26229
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text,
  role text not null default 'collector' check (role in ('collector','recycler','admin')),
  phone text,
  language text default 'en',
  created_at timestamptz not null default now()
);

create table if not exists recyclers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete set null,
  name text not null,
  location text,
  latitude double precision,
  longitude double precision,
  authorization_status text default 'pending',
  authorization_details text,
  accepted_materials text[] default '{}',
  offered_rates jsonb default '{}',
  pickup_available boolean default false,
  service_area text,
  contact text,
  created_at timestamptz not null default now()
);

create table if not exists lots (
  id uuid primary key default gen_random_uuid(),
  lot_id text unique not null default ('KC-' || to_char(now(),'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  collector_id uuid not null references profiles(id) on delete cascade,
  recycler_id uuid references recyclers(id) on delete set null,
  category text not null,
  description text,
  image_url text,
  weight_kg numeric(10,2) not null,
  value_low numeric(12,2),
  value_high numeric(12,2),
  estimated_value numeric(12,2),
  quoted_price numeric(12,2),
  final_sale_value numeric(12,2),
  latitude double precision,
  longitude double precision,
  classification_confidence numeric(5,4),
  classification_source text,
  status text not null default 'created' check (status in ('created','matched','offer_received','accepted','handover_pending','completed','cancelled')),
  payment_status text not null default 'pending' check (payment_status in ('pending','processing','paid','cash')),
  handover_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists price_history (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  subcategory text,
  location text,
  observed_date date not null default current_date,
  buying_price numeric(12,2) not null,
  unit text not null default 'kg',
  market_min numeric(12,2),
  market_max numeric(12,2),
  source_type text default 'recycler',
  recycler_id uuid references recyclers(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references lots(id) on delete cascade,
  recycler_id uuid not null references recyclers(id) on delete cascade,
  offered_price numeric(12,2) not null,
  pickup_available boolean default false,
  status text default 'pending' check(status in ('pending','accepted','rejected','expired')),
  created_at timestamptz not null default now()
);

create table if not exists transaction_events (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references lots(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  event_type text not null,
  event_data jsonb default '{}',
  created_at timestamptz not null default now()
);

-- Storage
insert into storage.buckets (id,name,public)
values ('e-waste-images','e-waste-images',true)
on conflict (id) do nothing;

-- RLS
alter table profiles enable row level security;
alter table recyclers enable row level security;
alter table lots enable row level security;
alter table price_history enable row level security;
alter table offers enable row level security;
alter table transaction_events enable row level security;

-- Profiles: users can read/update their own profile.
create policy "profiles own select" on profiles for select using (auth.uid()=id);
create policy "profiles own insert" on profiles for insert with check (auth.uid()=id);
create policy "profiles own update" on profiles for update using (auth.uid()=id);

-- Recycler directory is readable to signed-in users.
create policy "recycler directory read" on recyclers for select to authenticated using (true);

-- Lots: collector sees own lots; recycler/admin policies should be hardened in production.
create policy "collector read own lots" on lots for select using (auth.uid()=collector_id);
create policy "collector insert own lots" on lots for insert with check (auth.uid()=collector_id);
create policy "collector update own lots" on lots for update using (auth.uid()=collector_id);

-- Price board readable by signed-in users.
create policy "price board read" on price_history for select to authenticated using (true);

-- Offers: collector can see offers for own lots.
create policy "collector offers read" on offers for select using (
  exists(select 1 from lots l where l.id=offers.lot_id and l.collector_id=auth.uid())
);

-- Transaction events: collector can read own events.
create policy "collector events read" on transaction_events for select using (
  exists(select 1 from lots l where l.id=transaction_events.lot_id and l.collector_id=auth.uid())
);

-- IMPORTANT:
-- For a production deployment, create server-side/admin policies using role claims
-- rather than allowing broad client-side writes. Verify recycler authorization
-- against authoritative records before marking a recycler verified.
