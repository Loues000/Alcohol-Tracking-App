create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  display_name text not null default '',
  username text unique,
  avatar_url text
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  consumed_at timestamptz not null,
  category text not null,
  size_l numeric not null,
  custom_name text,
  abv_percent numeric,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entries_category_check check (category in ('beer', 'wine', 'sekt', 'longdrink', 'shot', 'other')),
  constraint entries_size_check check (size_l > 0)
);

create index if not exists entries_user_consumed_at_idx on public.entries (user_id, consumed_at desc);

alter table public.profiles enable row level security;
alter table public.entries enable row level security;

create policy "Profiles are viewable by owner" on public.profiles
  for select using (auth.uid() = id);

create policy "Profiles are insertable by owner" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Profiles are updatable by owner" on public.profiles
  for update using (auth.uid() = id);

create policy "Profiles are deletable by owner" on public.profiles
  for delete using (auth.uid() = id);

create policy "Entries are viewable by owner" on public.entries
  for select using (auth.uid() = user_id);

create policy "Entries are insertable by owner" on public.entries
  for insert with check (auth.uid() = user_id);

create policy "Entries are updatable by owner" on public.entries
  for update using (auth.uid() = user_id);

create policy "Entries are deletable by owner" on public.entries
  for delete using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.entries where user_id = auth.uid();
  delete from public.profiles where id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_account() from public;
grant execute on function public.delete_account() to authenticated;
