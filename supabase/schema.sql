-- WFICM database schema
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

-- Keep one saved presentation per song. Preserve the newest duplicate before
-- adding the constraint so this is safe to apply to an existing database.
with ranked_presentations as (
  select
    id,
    row_number() over (
      partition by song_id
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as row_number
  from public.presentations
)
delete from public.presentations p
using ranked_presentations duplicate
where p.id = duplicate.id
  and duplicate.row_number > 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'presentations_song_id_key'
      and conrelid = 'public.presentations'::regclass
  ) then
    alter table public.presentations
      add constraint presentations_song_id_key unique (song_id);
  end if;
end;
$$;

-- Transactional data operations --------------------------------------------

create or replace function public.create_song_with_sections(
  p_title text,
  p_artist text,
  p_raw_lyrics text,
  p_sections jsonb
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  created_song public.songs;
begin
  insert into public.songs (user_id, title, artist, raw_lyrics)
  values (auth.uid(), p_title, nullif(p_artist, ''), p_raw_lyrics)
  returning * into created_song;

  insert into public.song_sections (
    song_id, section_type, section_label, content, section_order
  )
  select
    created_song.id,
    coalesce(item ->> 'section_type', 'verse'),
    coalesce(item ->> 'section_label', ''),
    coalesce(item ->> 'content', ''),
    (entry.ordinality - 1)::integer
  from jsonb_array_elements(coalesce(p_sections, '[]'::jsonb)) with ordinality as entry(item, ordinality);

  return jsonb_build_object(
    'song', to_jsonb(created_song),
    'sections', coalesce(
      (
        select jsonb_agg(to_jsonb(ss) order by ss.section_order)
        from public.song_sections ss
        where ss.song_id = created_song.id
      ),
      '[]'::jsonb
    )
  );
end;
$$;

create or replace function public.replace_song_sections(
  p_song_id uuid,
  p_sections jsonb
)
returns jsonb
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.songs
    where id = p_song_id and user_id = auth.uid()
  ) then
    raise exception 'Song not found';
  end if;

  delete from public.song_sections where song_id = p_song_id;

  insert into public.song_sections (
    song_id, section_type, section_label, content, section_order
  )
  select
    p_song_id,
    coalesce(item ->> 'section_type', 'verse'),
    coalesce(item ->> 'section_label', ''),
    coalesce(item ->> 'content', ''),
    (entry.ordinality - 1)::integer
  from jsonb_array_elements(coalesce(p_sections, '[]'::jsonb)) with ordinality as entry(item, ordinality);

  return coalesce(
    (
      select jsonb_agg(to_jsonb(ss) order by ss.section_order)
      from public.song_sections ss
      where ss.song_id = p_song_id
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.replace_worship_set_songs(
  p_worship_set_id uuid,
  p_song_ids uuid[]
)
returns void
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.worship_sets
    where id = p_worship_set_id and user_id = auth.uid()
  ) then
    raise exception 'Worship set not found';
  end if;

  delete from public.worship_set_songs
  where worship_set_id = p_worship_set_id;

  insert into public.worship_set_songs (worship_set_id, song_id, song_order)
  select p_worship_set_id, song_id, ordinality - 1
  from unnest(coalesce(p_song_ids, '{}'::uuid[])) with ordinality as entries(song_id, ordinality);
end;
$$;

-- Atomic song deletion. Foreign-key cascades remove sections, presentations,
-- and worship-set links in the same transaction as the parent deletion.
create or replace function public.delete_song_with_dependencies(
  p_song_id uuid
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  presentation_settings jsonb;
  deleted_song public.songs;
begin
  if not exists (
    select 1 from public.songs
    where id = p_song_id and user_id = auth.uid()
  ) then
    raise exception 'Song not found';
  end if;

  select p.settings into presentation_settings
  from public.presentations p
  where p.song_id = p_song_id;

  delete from public.songs
  where id = p_song_id and user_id = auth.uid()
  returning * into deleted_song;

  return jsonb_build_object(
    'presentation_settings', presentation_settings
  );
end;
$$;

-- Atomic worship-set deletion. The foreign key cascade removes its song links.
create or replace function public.delete_worship_set_with_dependencies(
  p_worship_set_id uuid
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  worship_set_settings jsonb;
  deleted_set public.worship_sets;
begin
  if not exists (
    select 1 from public.worship_sets
    where id = p_worship_set_id and user_id = auth.uid()
  ) then
    raise exception 'Worship set not found';
  end if;

  select ws.settings into worship_set_settings
  from public.worship_sets ws
  where ws.id = p_worship_set_id;

  delete from public.worship_sets
  where id = p_worship_set_id and user_id = auth.uid()
  returning * into deleted_set;

  return jsonb_build_object(
    'worship_set_settings', worship_set_settings
  );
end;
$$;

-- Atomic Worship Set duplication. Any failure rolls back the new parent and
-- all copied links because the function runs in one database transaction.
create or replace function public.duplicate_worship_set(
  p_worship_set_id uuid
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  source_set public.worship_sets;
  copied_set public.worship_sets;
  source_song_count integer;
  copied_song_count integer;
begin
  select * into source_set
  from public.worship_sets
  where id = p_worship_set_id and user_id = auth.uid();

  if not found then
    raise exception 'Worship set not found';
  end if;

  insert into public.worship_sets (
    user_id,
    name,
    settings,
    add_song_title_slides
  )
  values (
    auth.uid(),
    source_set.name || ' — Copy',
    source_set.settings,
    source_set.add_song_title_slides
  )
  returning * into copied_set;

  insert into public.worship_set_songs (
    worship_set_id,
    song_id,
    song_order
  )
  select
    copied_set.id,
    wss.song_id,
    wss.song_order
  from public.worship_set_songs wss
  join public.songs s on s.id = wss.song_id
  where wss.worship_set_id = source_set.id
    and s.user_id = auth.uid()
  order by wss.song_order;

  select count(*) into source_song_count
  from public.worship_set_songs
  where worship_set_id = source_set.id;

  select count(*) into copied_song_count
  from public.worship_set_songs
  where worship_set_id = copied_set.id;

  if copied_song_count <> source_song_count then
    raise exception 'Worship set contains unavailable songs';
  end if;

  return jsonb_build_object(
    'worship_set', to_jsonb(copied_set)
  );
end;
$$;

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
  for all using (
    auth.uid () = user_id
    and exists (
      select 1 from public.songs s
      where s.id = song_id and s.user_id = auth.uid ()
    )
  ) with check (
    auth.uid () = user_id
    and exists (
      select 1 from public.songs s
      where s.id = song_id and s.user_id = auth.uid ()
    )
  );

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
-- Presentation media is session-local in the browser and is not uploaded.
-- Secure any legacy bucket without deleting its objects.

update storage.buckets
set public = false
where id = 'maya-assets';

drop policy if exists "maya_assets_insert_own_folder" on storage.objects;
drop policy if exists "maya_assets_select_public" on storage.objects;
drop policy if exists "maya_assets_delete_own" on storage.objects;
