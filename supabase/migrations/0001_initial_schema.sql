create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled',
  content text not null default '',
  tags text[] not null default '{}',
  category text,
  is_archived boolean not null default false,
  is_public boolean not null default false,
  share_id text unique,
  ai_summary text,
  ai_action_items jsonb,
  ai_suggested_title text,
  ai_last_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid references notes(id) on delete set null,
  operation text not null,
  created_at timestamptz not null default now()
);

create index notes_user_id_idx on notes(user_id);
create index notes_updated_at_idx on notes(updated_at desc);
create index notes_share_id_idx on notes(share_id) where share_id is not null;
create index ai_usage_user_id_idx on ai_usage(user_id);

alter table notes enable row level security;
alter table ai_usage enable row level security;

create policy "users read own notes" on notes for select using (auth.uid() = user_id);
create policy "users insert own notes" on notes for insert with check (auth.uid() = user_id);
create policy "users update own notes" on notes for update using (auth.uid() = user_id);
create policy "users delete own notes" on notes for delete using (auth.uid() = user_id);
create policy "public read shared notes" on notes for select using (is_public = true and share_id is not null);

create policy "users read own ai_usage" on ai_usage for select using (auth.uid() = user_id);
create policy "users insert own ai_usage" on ai_usage for insert with check (auth.uid() = user_id);

create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger notes_updated_at before update on notes
for each row execute function update_updated_at();

create or replace function get_top_tags(uid uuid, limit_count int default 5)
returns table(tag text, count bigint) as $$
  select unnest(tags) as tag, count(*) as count
  from notes
  where user_id = uid and is_archived = false
  group by tag
  order by count desc
  limit limit_count;
$$ language sql security definer;
