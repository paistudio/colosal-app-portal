-- Profiles table: extends Supabase auth.users
create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  username              text,
  email                 text,
  whatsapp              text,

  -- Onboarding
  user_type             text check (user_type in ('freelancer', 'agency', 'other')),
  custom_type           text,                          -- filled when user_type = 'other'
  onboarding_completed  boolean not null default false,

  -- Upwork OAuth
  upwork_access_token   text,
  upwork_refresh_token  text,
  upwork_connected_at   timestamptz,

  -- Profile questionnaire
  summary               text,
  current_role          text,
  previous_experience   text,
  skills                text,
  portfolio             text,
  key_proof_points      text,
  positioning_notes     text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Auto-create profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_profiles_updated on public.profiles;
create trigger on_profiles_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- RLS: enable row-level security
alter table public.profiles enable row level security;

-- Users can only read their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can only update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Service role can insert (triggered by handle_new_user)
create policy "Service role can insert profiles"
  on public.profiles for insert
  with check (true);
