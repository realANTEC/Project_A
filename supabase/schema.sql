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

-- ---- message actions (reactions, reply, unsend, pin) -----------------------
-- All idempotent / safe to re-run.

-- Reply: a message may reference the message it is replying to.
alter table public.messages
  add column if not exists reply_to uuid references public.messages (id) on delete set null;

-- Edit: a message may be edited; edited_at records when (null = never edited).
alter table public.messages
  add column if not exists edited_at timestamptz;

-- Unsend = delete-for-everyone, own messages only.
drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own" on public.messages
  for delete using (auth.uid() = sender_id);

-- Edit = update own message body, own messages only.
drop policy if exists "messages_update_own" on public.messages;
create policy "messages_update_own" on public.messages
  for update using (auth.uid() = sender_id) with check (auth.uid() = sender_id);

-- So realtime DELETE events carry the full old row (the conversation_id filter
-- then matches on delete, and clients can act on the removed message).
alter table public.messages replica identity full;

-- Security-definer lookup of a message's conversation, so the reaction policies
-- can member-check without recursing through messages' own RLS.
create or replace function public.message_conversation(msg uuid)
returns uuid language sql security definer set search_path = public stable as $$
  select conversation_id from public.messages where id = msg;
$$;

-- Reactions: one reaction per (message, user) — re-reacting replaces it (IG-style).
create table if not exists public.message_reactions (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
alter table public.message_reactions enable row level security;
drop policy if exists "message_reactions_select_member" on public.message_reactions;
drop policy if exists "message_reactions_insert_own" on public.message_reactions;
drop policy if exists "message_reactions_update_own" on public.message_reactions;
drop policy if exists "message_reactions_delete_own" on public.message_reactions;
create policy "message_reactions_select_member" on public.message_reactions for select
  using (public.is_member(public.message_conversation(message_id)));
create policy "message_reactions_insert_own" on public.message_reactions for insert
  with check (auth.uid() = user_id and public.is_member(public.message_conversation(message_id)));
create policy "message_reactions_update_own" on public.message_reactions for update
  using (auth.uid() = user_id);
create policy "message_reactions_delete_own" on public.message_reactions for delete
  using (auth.uid() = user_id);

-- Pins: any member can pin/unpin a message; one pin row per message.
create table if not exists public.message_pins (
  message_id uuid primary key references public.messages (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  pinned_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.message_pins enable row level security;
-- Carry the full old row on realtime DELETE so an unpin reaches the other client (the
-- conversation_id filter + RLS need conversation_id, which the default replica identity omits).
alter table public.message_pins replica identity full;
drop policy if exists "message_pins_select_member" on public.message_pins;
drop policy if exists "message_pins_insert_member" on public.message_pins;
drop policy if exists "message_pins_delete_member" on public.message_pins;
create policy "message_pins_select_member" on public.message_pins for select
  using (public.is_member(conversation_id));
create policy "message_pins_insert_member" on public.message_pins for insert
  with check (auth.uid() = pinned_by and public.is_member(conversation_id));
create policy "message_pins_delete_member" on public.message_pins for delete
  using (public.is_member(conversation_id));

-- Realtime for the new tables.
do $$
declare t text;
begin
  foreach t in array array['message_reactions', 'message_pins'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---- attachments: media / document / location / contact + polls + events ----
-- All idempotent / safe to re-run. Static attachments (image, document, location,
-- contact, and a poll/event reference) ride a jsonb column on the message; rich
-- state (poll votes, event RSVPs) lives in its own tables.
alter table public.messages
  add column if not exists attachment jsonb;

-- Polls -----------------------------------------------------------------------
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  question text not null check (char_length(question) between 1 and 300),
  options text[] not null check (array_length(options, 1) between 2 and 12),
  allow_multiple boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.polls enable row level security;

-- Security-definer lookup of a poll's conversation, so vote policies can member-check
-- without recursing through the poll's own RLS.
create or replace function public.poll_conversation(p uuid)
returns uuid language sql security definer set search_path = public stable as $$
  select conversation_id from public.polls where id = p;
$$;

create table if not exists public.poll_votes (
  poll_id uuid not null references public.polls (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  option_index int not null,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id, option_index)
);
alter table public.poll_votes enable row level security;
-- realtime DELETE (a vote change) must carry poll_id past the RLS/filter.
alter table public.poll_votes replica identity full;

drop policy if exists "polls_select_member" on public.polls;
drop policy if exists "polls_insert_member" on public.polls;
create policy "polls_select_member" on public.polls for select using (public.is_member(conversation_id));
create policy "polls_insert_member" on public.polls for insert
  with check (auth.uid() = created_by and public.is_member(conversation_id));

drop policy if exists "poll_votes_select_member" on public.poll_votes;
drop policy if exists "poll_votes_insert_own" on public.poll_votes;
drop policy if exists "poll_votes_delete_own" on public.poll_votes;
create policy "poll_votes_select_member" on public.poll_votes for select
  using (public.is_member(public.poll_conversation(poll_id)));
create policy "poll_votes_insert_own" on public.poll_votes for insert
  with check (auth.uid() = user_id and public.is_member(public.poll_conversation(poll_id)));
create policy "poll_votes_delete_own" on public.poll_votes for delete
  using (auth.uid() = user_id);

-- Events ----------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  location text,
  starts_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.events enable row level security;

create or replace function public.event_conversation(e uuid)
returns uuid language sql security definer set search_path = public stable as $$
  select conversation_id from public.events where id = e;
$$;

create table if not exists public.event_rsvps (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('going', 'maybe', 'no')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
alter table public.event_rsvps enable row level security;
alter table public.event_rsvps replica identity full;

drop policy if exists "events_select_member" on public.events;
drop policy if exists "events_insert_member" on public.events;
create policy "events_select_member" on public.events for select using (public.is_member(conversation_id));
create policy "events_insert_member" on public.events for insert
  with check (auth.uid() = created_by and public.is_member(conversation_id));

drop policy if exists "event_rsvps_select_member" on public.event_rsvps;
drop policy if exists "event_rsvps_insert_own" on public.event_rsvps;
drop policy if exists "event_rsvps_update_own" on public.event_rsvps;
drop policy if exists "event_rsvps_delete_own" on public.event_rsvps;
create policy "event_rsvps_select_member" on public.event_rsvps for select
  using (public.is_member(public.event_conversation(event_id)));
create policy "event_rsvps_insert_own" on public.event_rsvps for insert
  with check (auth.uid() = user_id and public.is_member(public.event_conversation(event_id)));
create policy "event_rsvps_update_own" on public.event_rsvps for update
  using (auth.uid() = user_id);
create policy "event_rsvps_delete_own" on public.event_rsvps for delete
  using (auth.uid() = user_id);

-- Realtime for live tallies / RSVPs (the poll/event rows themselves arrive as a message).
do $$
declare t text;
begin
  foreach t in array array['poll_votes', 'event_rsvps'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
