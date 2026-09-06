-- MAYA database schema
-- Run this once in the Supabase SQL Editor for your project.

-- Extensions ---------------------------------------------------------------

create extension if not exists "pgcrypto";

-- Tables -------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  artist text,
  raw_lyrics text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists songs_user_id_idx on public.songs (user_id);

create table if not exists public.song_sections (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  section_type text not null default 'verse',
  section_label text not null default '',
  content text not null default '',
  section_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists song_sections_song_id_idx on public.song_sections (song_id, section_order);

create table if not exists public.presentations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.worship_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  settings jsonb not null default '{}'::jsonb,
  add_song_title_slides boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.worship_set_songs (
  id uuid primary key default gen_random_uuid(),
  worship_set_id uuid not null references public.worship_sets (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  song_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (worship_set_id, song_id)
);

create index if not exists worship_sets_user_id_idx on public.worship_sets (user_id);
create index if not exists worship_set_songs_order_idx on public.worship_set_songs (worship_set_id, song_order);

create index if not exists presentations_song_id_idx on public.presentations (song_id);

-- updated_at trigger --------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists songs_set_updated_at on public.songs;
create trigger songs_set_updated_at
  before update on public.songs
  for each row execute function public.set_updated_at();

drop trigger if exists presentations_set_updated_at on public.presentations;
create trigger presentations_set_updated_at
  before update on public.presentations
  for each row execute function public.set_updated_at();

drop trigger if exists worship_sets_set_updated_at on public.worship_sets;
create trigger worship_sets_set_updated_at
  before update on public.worship_sets
  for each row execute function public.set_updated_at();

-- Auto-create a profile for every new auth user -----------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security ---------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.songs enable row level security;
alter table public.song_sections enable row level security;
alter table public.presentations enable row level security;
alter table public.worship_sets enable row level security;
alter table public.worship_set_songs enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid () = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid () = id);

drop policy if exists "songs_all_own" on public.songs;
create policy "songs_all_own" on public.songs
  for all using (auth.uid () = user_id) with check (auth.uid () = user_id);

drop policy if exists "song_sections_all_own" on public.song_sections;
create policy "song_sections_all_own" on public.song_sections
  for all using (
    exists (
      select 1 from public.songs s
      where s.id = song_id and s.user_id = auth.uid ()
    )
  )
  with check (
    exists (
      select 1 from public.songs s
      where s.id = song_id and s.user_id = auth.uid ()
    )
  );

drop policy if exists "presentations_all_own" on public.presentations;
create policy "presentations_all_own" on public.presentations
  for all using (auth.uid () = user_id) with check (auth.uid () = user_id);

drop policy if exists "worship_sets_all_own" on public.worship_sets;
create policy "worship_sets_all_own" on public.worship_sets
  for all using (auth.uid () = user_id) with check (auth.uid () = user_id);

drop policy if exists "worship_set_songs_all_own" on public.worship_set_songs;
create policy "worship_set_songs_all_own" on public.worship_set_songs
  for all using (
    exists (select 1 from public.worship_sets ws where ws.id = worship_set_id and ws.user_id = auth.uid ())
    and exists (select 1 from public.songs s where s.id = song_id and s.user_id = auth.uid ())
  ) with check (
    exists (select 1 from public.worship_sets ws where ws.id = worship_set_id and ws.user_id = auth.uid ())
    and exists (select 1 from public.songs s where s.id = song_id and s.user_id = auth.uid ())
  );

-- Storage --------------------------------------------------------------------
-- Public bucket for presentation background assets (images / videos).

insert into storage.buckets (id, name, public)
values ('maya-assets', 'maya-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "maya_assets_insert_own_folder" on storage.objects;
create policy "maya_assets_insert_own_folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'maya-assets'
    and (storage.foldername(name))[1] = auth.uid ()::text
  );

drop policy if exists "maya_assets_select_public" on storage.objects;
create policy "maya_assets_select_public" on storage.objects
  for select using (bucket_id = 'maya-assets');

drop policy if exists "maya_assets_delete_own" on storage.objects;
create policy "maya_assets_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'maya-assets'
    and (storage.foldername(name))[1] = auth.uid ()::text
  );
