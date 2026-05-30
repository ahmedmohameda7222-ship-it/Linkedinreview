create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  linkedin_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_linkedin_url_check check (
    linkedin_url is null
    or linkedin_url = ''
    or linkedin_url ~* '^https://www\.linkedin\.com/in/.+'
  )
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  target_url text not null,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint companies_name_length_check check (char_length(trim(name)) between 2 and 80),
  constraint companies_slug_format_check check (slug ~ '^[a-z0-9-]{3,80}$'),
  constraint companies_target_url_check check (target_url ~* '^https://www\.linkedin\.com/in/.+')
);

create table if not exists public.clicks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  clicked_at timestamptz not null default timezone('utc', now()),
  referrer text,
  user_agent text,
  ip_hash text,
  country text,
  device text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists profiles_user_id_idx on public.profiles(user_id);
create index if not exists companies_user_id_idx on public.companies(user_id);
create index if not exists companies_slug_idx on public.companies(slug);
create index if not exists companies_active_idx on public.companies(active);
create index if not exists clicks_user_id_idx on public.clicks(user_id);
create index if not exists clicks_company_id_idx on public.clicks(company_id);
create index if not exists clicks_clicked_at_idx on public.clicks(clicked_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
before update on public.companies
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, linkedin_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'linkedin_url', '')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
