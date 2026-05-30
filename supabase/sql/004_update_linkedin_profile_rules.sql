-- Optional migration for projects that already ran an older schema.
-- This removes any trigger-level default LinkedIn URL and enforces the new URL prefix rule.

alter table public.profiles
  drop constraint if exists profiles_linkedin_url_check;

alter table public.profiles
  add constraint profiles_linkedin_url_check check (
    linkedin_url is null
    or linkedin_url = ''
    or linkedin_url ~* '^https://www\.linkedin\.com/in/.+'
  );

alter table public.companies
  drop constraint if exists companies_target_url_check;

alter table public.companies
  add constraint companies_target_url_check check (target_url ~* '^https://www\.linkedin\.com/in/.+');

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
