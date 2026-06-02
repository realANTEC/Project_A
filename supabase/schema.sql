-- ============================================================================
-- Soul — Supabase schema
-- Paste this whole file into the Supabase SQL Editor and click "Run".
-- It is idempotent (safe to re-run). Then add your project URL + anon key to
-- .env.local (see .env.local.example) and restart the dev server.
-- ============================================================================

-- ---- profiles --------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  name text not null default 'New user',
  avatar_url text,
  bio text,
  website text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base text;
  uname text;
begin
  -- Anonymous users have no email, so fall back to a uuid-derived handle.
  base := coalesce(
    new.raw_user_meta_data ->> 'username',
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'aurora'
  );
  uname := base;
  if exists (select 1 from public.profiles where username = uname) then
    uname := base || '_' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;
  insert into public.profiles (id, username, name, avatar_url)
  values (
    new.id,
    uname,
    coalesce(new.raw_user_meta_data ->> 'name', base),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---- posts -----------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  image_url text not null,
  aspect text not null default 'square' check (aspect in ('portrait', 'square', 'landscape')),
  tint text[] not null default array['#7c5cff', '#45e6d8'],
  location text,
  caption text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.posts enable row level security;
drop policy if exists "posts_select" on public.posts;
drop policy if exists "posts_insert_own" on public.posts;
drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_select" on public.posts for select using (true);
create policy "posts_insert_own" on public.posts for insert with check (auth.uid() = author_id);
create policy "posts_delete_own" on public.posts for delete using (auth.uid() = author_id);
create index if not exists posts_created_at_idx on public.posts (created_at desc);

-- ---- likes -----------------------------------------------------------------
create table if not exists public.likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
alter table public.likes enable row level security;
drop policy if exists "likes_select" on public.likes;
drop policy if exists "likes_insert_own" on public.likes;
drop policy if exists "likes_delete_own" on public.likes;
create policy "likes_select" on public.likes for select using (true);
create policy "likes_insert_own" on public.likes for insert with check (auth.uid() = user_id);
create policy "likes_delete_own" on public.likes for delete using (auth.uid() = user_id);
create index if not exists likes_post_idx on public.likes (post_id);

-- ---- saves -----------------------------------------------------------------
create table if not exists public.saves (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
alter table public.saves enable row level security;
drop policy if exists "saves_select_own" on public.saves;
drop policy if exists "saves_insert_own" on public.saves;
drop policy if exists "saves_delete_own" on public.saves;
create policy "saves_select_own" on public.saves for select using (auth.uid() = user_id);
create policy "saves_insert_own" on public.saves for insert with check (auth.uid() = user_id);
create policy "saves_delete_own" on public.saves for delete using (auth.uid() = user_id);

-- ---- comments (threaded via parent_id) -------------------------------------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
alter table public.comments enable row level security;
drop policy if exists "comments_select" on public.comments;
drop policy if exists "comments_insert_own" on public.comments;
drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_select" on public.comments for select using (true);
create policy "comments_insert_own" on public.comments for insert with check (auth.uid() = author_id);
create policy "comments_delete_own" on public.comments for delete using (auth.uid() = author_id);
create index if not exists comments_post_idx on public.comments (post_id, created_at);

-- ---- comment likes ---------------------------------------------------------
create table if not exists public.comment_likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  comment_id uuid not null references public.comments (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, comment_id)
);
alter table public.comment_likes enable row level security;
drop policy if exists "comment_likes_select" on public.comment_likes;
drop policy if exists "comment_likes_insert_own" on public.comment_likes;
drop policy if exists "comment_likes_delete_own" on public.comment_likes;
create policy "comment_likes_select" on public.comment_likes for select using (true);
create policy "comment_likes_insert_own" on public.comment_likes for insert with check (auth.uid() = user_id);
create policy "comment_likes_delete_own" on public.comment_likes for delete using (auth.uid() = user_id);
create index if not exists comment_likes_comment_idx on public.comment_likes (comment_id);

-- ---- follows ---------------------------------------------------------------
create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
alter table public.follows enable row level security;
drop policy if exists "follows_select" on public.follows;
drop policy if exists "follows_insert_own" on public.follows;
drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_select" on public.follows for select using (true);
create policy "follows_insert_own" on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete_own" on public.follows for delete using (auth.uid() = follower_id);

-- ---- notifications ---------------------------------------------------------
-- Created client-side by the actor (the person who followed/liked/commented) for the
-- recipient. RLS: you read your own, and you may only insert ones where you are the actor.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('follow', 'like', 'comment')),
  post_id uuid references public.posts (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_insert_actor" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_select_own" on public.notifications for select using (user_id = auth.uid());
create policy "notifications_insert_actor" on public.notifications
  for insert with check (actor_id = auth.uid() and actor_id <> user_id);
create policy "notifications_update_own" on public.notifications for update using (user_id = auth.uid());
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---- direct messages -------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (conversation_id, user_id)
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
-- Per-member read cursor for unread counts (idempotent; safe to re-run on existing data).
alter table public.conversation_members add column if not exists last_read_at timestamptz;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

create or replace function public.is_member(conv uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.conversation_members m
    where m.conversation_id = conv and m.user_id = auth.uid()
  );
$$;

drop policy if exists "conversations_select_member" on public.conversations;
drop policy if exists "conversations_insert_authed" on public.conversations;
drop policy if exists "members_select_member" on public.conversation_members;
drop policy if exists "members_insert_authed" on public.conversation_members;
drop policy if exists "members_update_self" on public.conversation_members;
drop policy if exists "messages_select_member" on public.messages;
drop policy if exists "messages_insert_member" on public.messages;
create policy "conversations_select_member" on public.conversations for select using (public.is_member(id));
create policy "conversations_insert_authed" on public.conversations for insert with check (auth.uid() is not null);
create policy "members_select_member" on public.conversation_members for select using (public.is_member(conversation_id));
create policy "members_insert_authed" on public.conversation_members for insert with check (auth.uid() is not null);
create policy "members_update_self" on public.conversation_members for update using (user_id = auth.uid());
create policy "messages_select_member" on public.messages for select using (public.is_member(conversation_id));
create policy "messages_insert_member" on public.messages
  for insert with check (auth.uid() = sender_id and public.is_member(conversation_id));
create index if not exists messages_conv_idx on public.messages (conversation_id, created_at);

-- ---- storage (post images + avatars) ---------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;
drop policy if exists "media_public_read" on storage.objects;
drop policy if exists "media_authed_upload" on storage.objects;
drop policy if exists "media_owner_update" on storage.objects;
drop policy if exists "media_owner_delete" on storage.objects;
create policy "media_public_read" on storage.objects for select using (bucket_id = 'media');
create policy "media_authed_upload" on storage.objects
  for insert with check (bucket_id = 'media' and auth.uid() is not null);
create policy "media_owner_update" on storage.objects
  for update using (bucket_id = 'media' and owner = auth.uid());
create policy "media_owner_delete" on storage.objects
  for delete using (bucket_id = 'media' and owner = auth.uid());

-- ---- realtime --------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['posts', 'comments', 'likes', 'messages', 'follows', 'comment_likes', 'notifications'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
