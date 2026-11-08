-- Persist extended profile fields used by onboarding and Profile Settings.
-- Safe to apply when some or all columns already exist.

alter table public.profiles
  add column if not exists height text,
  add column if not exists occupation text,
  add column if not exists college text,
  add column if not exists education_status text,
  add column if not exists profile_prompts jsonb not null default '[]'::jsonb,
  add column if not exists smoking text,
  add column if not exists alcohol text,
  add column if not exists religion text;

-- The core schema intentionally uses column-level grants. Extend those grants
-- for the additional profile fields without granting access to protected columns.
grant insert (
  id, display_name, date_of_birth, gender, interested_in, city, neighbourhood,
  bio, languages, interests, relationship_intention, height, occupation,
  college, education_status, profile_prompts, smoking, alcohol, religion
) on public.profiles to authenticated;

grant update (
  height, occupation, college, education_status, profile_prompts,
  smoking, alcohol, religion
) on public.profiles to authenticated;
