-- ============================================
-- ReviewBridge — Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. USERS TABLE
-- Extends Supabase auth.users with app-specific fields
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'agency')),
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can read own data"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own data"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can insert own data"
  on public.users for insert
  with check (auth.uid() = id);


-- 2. SOURCES TABLE
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  platform text not null check (platform in ('google', 'trustpilot')),
  place_id text not null,
  business_name text not null,
  total_score numeric,
  total_reviews_count integer,
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.sources enable row level security;

create policy "Users can read own sources"
  on public.sources for select
  using (auth.uid() = user_id);

create policy "Users can insert own sources"
  on public.sources for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sources"
  on public.sources for update
  using (auth.uid() = user_id);

create policy "Users can delete own sources"
  on public.sources for delete
  using (auth.uid() = user_id);


-- 3. REVIEWS TABLE
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  reviewer_name text not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  body text,
  reviewed_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint reviews_source_reviewer_date_unique unique (source_id, reviewer_name, reviewed_at)
);

alter table public.reviews enable row level security;

-- Users can read reviews belonging to their own sources
create policy "Users can read own reviews"
  on public.reviews for select
  using (
    exists (
      select 1 from public.sources
      where sources.id = reviews.source_id
        and sources.user_id = auth.uid()
    )
  );

create policy "Users can insert own reviews"
  on public.reviews for insert
  with check (
    exists (
      select 1 from public.sources
      where sources.id = reviews.source_id
        and sources.user_id = auth.uid()
    )
  );

create policy "Users can update own reviews"
  on public.reviews for update
  using (
    exists (
      select 1 from public.sources
      where sources.id = reviews.source_id
        and sources.user_id = auth.uid()
    )
  );

create policy "Users can delete own reviews"
  on public.reviews for delete
  using (
    exists (
      select 1 from public.sources
      where sources.id = reviews.source_id
        and sources.user_id = auth.uid()
    )
  );


-- 4. WIDGETS TABLE
create table public.widgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  theme text not null default 'light' check (theme in ('light', 'dark', 'minimal')),
  max_reviews integer not null default 5,
  show_badge boolean not null default true,
  smart_filter boolean not null default false,
  embed_token text not null unique,
  created_at timestamptz not null default now()
);

alter table public.widgets enable row level security;

create policy "Users can read own widgets"
  on public.widgets for select
  using (auth.uid() = user_id);

create policy "Users can insert own widgets"
  on public.widgets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own widgets"
  on public.widgets for update
  using (auth.uid() = user_id);

create policy "Users can delete own widgets"
  on public.widgets for delete
  using (auth.uid() = user_id);

-- Public read policy for the widget API endpoint (looks up by embed_token)
create policy "Public can read widgets by embed_token"
  on public.widgets for select
  using (true);

-- Public read policy for reviews (needed by the widget API)
create policy "Public can read reviews via widget"
  on public.reviews for select
  using (true);


-- 5. FUNCTION: Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
