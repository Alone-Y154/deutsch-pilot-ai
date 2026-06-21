create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  target_level text default 'B1',
  goal text default 'General German + exam readiness',
  is_active boolean not null default true,
  deactivated_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles
add column if not exists is_active boolean not null default true;

alter table public.profiles
add column if not exists deactivated_at timestamptz;

create table if not exists public.beta_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text,
  source text not null default 'public_signup',
  status text not null default 'waiting' check (status in ('waiting', 'invited', 'rejected')),
  created_at timestamptz default now()
);

create table if not exists public.skill_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill text not null,
  score integer not null check (score between 0 and 100),
  cefr_level text,
  updated_at timestamptz default now()
);

create table if not exists public.speaking_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null,
  level text not null,
  task_title text not null,
  task_prompt text not null,
  transcript text not null,
  corrected_german text,
  feedback jsonb not null default '{}'::jsonb,
  fluency_score integer check (fluency_score between 0 and 100),
  task_completion_score integer check (task_completion_score between 0 and 100),
  weak_tags text[] not null default '{}',
  created_at timestamptz default now()
);

create table if not exists public.weakness_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  weak_tag text not null,
  severity integer not null default 1 check (severity between 1 and 5),
  status text not null default 'active',
  created_at timestamptz default now()
);

create table if not exists public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.conversation_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  level text not null,
  scenario_title text not null,
  scenario_payload jsonb not null default '{}'::jsonb,
  conversation_history jsonb not null default '[]'::jsonb,
  report jsonb not null default '{}'::jsonb,
  weak_tags text[] not null default '{}',
  fluency_score integer check (fluency_score between 0 and 100),
  grammar_score integer check (grammar_score between 0 and 100),
  vocabulary_score integer check (vocabulary_score between 0 and 100),
  task_completion_score integer check (task_completion_score between 0 and 100),
  created_at timestamptz default now()
);

create table if not exists public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'generated', 'in_progress', 'completed')),
  target_level text not null default 'B1',
  interview_type text not null default 'mixed HR + behavioral + role-specific',
  question_count integer not null default 8 check (question_count between 1 and 20),
  question_mode text not null default 'listen',
  job_description text not null,
  resume_text text not null,
  analysis jsonb not null default '{}'::jsonb,
  question_set jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);

create table if not exists public.interview_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.interview_sessions(id) on delete cascade,
  question_id text not null,
  category text not null,
  difficulty text not null,
  question_german text not null,
  question_english text,
  payload jsonb not null default '{}'::jsonb,
  position integer not null default 1,
  created_at timestamptz default now()
);

create table if not exists public.interview_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.interview_sessions(id) on delete cascade,
  question_id text not null,
  transcript text not null,
  feedback jsonb not null default '{}'::jsonb,
  grammar_score integer check (grammar_score between 0 and 100),
  vocabulary_score integer check (vocabulary_score between 0 and 100),
  fluency_score integer check (fluency_score between 0 and 100),
  role_fit_score integer check (role_fit_score between 0 and 100),
  answer_structure_score integer check (answer_structure_score between 0 and 100),
  confidence_score integer check (confidence_score between 0 and 100),
  weak_tags text[] not null default '{}',
  created_at timestamptz default now()
);

create table if not exists public.interview_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.interview_sessions(id) on delete cascade,
  report jsonb not null default '{}'::jsonb,
  overall_readiness_score integer check (overall_readiness_score between 0 and 100),
  estimated_speaking_level text,
  grammar_score integer check (grammar_score between 0 and 100),
  vocabulary_score integer check (vocabulary_score between 0 and 100),
  fluency_score integer check (fluency_score between 0 and 100),
  role_fit_score integer check (role_fit_score between 0 and 100),
  answer_structure_score integer check (answer_structure_score between 0 and 100),
  confidence_score integer check (confidence_score between 0 and 100),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.beta_waitlist enable row level security;
alter table public.skill_scores enable row level security;
alter table public.speaking_attempts enable row level security;
alter table public.weakness_events enable row level security;
alter table public.ai_reports enable row level security;
alter table public.conversation_reports enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.interview_questions enable row level security;
alter table public.interview_answers enable row level security;
alter table public.interview_reports enable row level security;

grant usage on schema public to authenticated;
grant usage on schema public to service_role;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.skill_scores to authenticated;
grant select, insert, update, delete on public.speaking_attempts to authenticated;
grant select, insert, update, delete on public.weakness_events to authenticated;
grant select, insert, update, delete on public.ai_reports to authenticated;
grant select, insert, update, delete on public.conversation_reports to authenticated;
grant select, insert, update, delete on public.interview_sessions to authenticated;
grant select, insert, update, delete on public.interview_questions to authenticated;
grant select, insert, update, delete on public.interview_answers to authenticated;
grant select, insert, update, delete on public.interview_reports to authenticated;

grant all on public.profiles to service_role;
grant all on public.beta_waitlist to service_role;
grant all on public.skill_scores to service_role;
grant all on public.speaking_attempts to service_role;
grant all on public.weakness_events to service_role;
grant all on public.ai_reports to service_role;
grant all on public.conversation_reports to service_role;
grant all on public.interview_sessions to service_role;
grant all on public.interview_questions to service_role;
grant all on public.interview_answers to service_role;
grant all on public.interview_reports to service_role;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "beta_waitlist_no_client_access" on public.beta_waitlist;
drop policy if exists "skill_scores_all_own" on public.skill_scores;
drop policy if exists "speaking_attempts_all_own" on public.speaking_attempts;
drop policy if exists "weakness_events_all_own" on public.weakness_events;
drop policy if exists "ai_reports_all_own" on public.ai_reports;
drop policy if exists "conversation_reports_all_own" on public.conversation_reports;
drop policy if exists "interview_sessions_all_own" on public.interview_sessions;
drop policy if exists "interview_questions_all_own" on public.interview_questions;
drop policy if exists "interview_answers_all_own" on public.interview_answers;
drop policy if exists "interview_reports_all_own" on public.interview_reports;

create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() is not null and auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() is not null and auth.uid() = id);

create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() is not null and auth.uid() = id)
with check (auth.uid() is not null and auth.uid() = id);

create policy "beta_waitlist_no_client_access"
on public.beta_waitlist for select
using (false);

create policy "skill_scores_all_own"
on public.skill_scores for all
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "speaking_attempts_all_own"
on public.speaking_attempts for all
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "weakness_events_all_own"
on public.weakness_events for all
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "ai_reports_all_own"
on public.ai_reports for all
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "conversation_reports_all_own"
on public.conversation_reports for all
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "interview_sessions_all_own"
on public.interview_sessions for all
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "interview_questions_all_own"
on public.interview_questions for all
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "interview_answers_all_own"
on public.interview_answers for all
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "interview_reports_all_own"
on public.interview_reports for all
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create index if not exists speaking_attempts_user_created_idx
on public.speaking_attempts (user_id, created_at desc);

create index if not exists profiles_active_created_idx
on public.profiles (is_active, created_at desc);

create index if not exists beta_waitlist_status_created_idx
on public.beta_waitlist (status, created_at desc);

create index if not exists weakness_events_user_tag_idx
on public.weakness_events (user_id, weak_tag, status);

create index if not exists conversation_reports_user_created_idx
on public.conversation_reports (user_id, created_at desc);

create index if not exists interview_sessions_user_created_idx
on public.interview_sessions (user_id, created_at desc);

create index if not exists interview_sessions_user_status_idx
on public.interview_sessions (user_id, status, created_at desc);

create index if not exists interview_questions_session_position_idx
on public.interview_questions (session_id, position);

create index if not exists interview_answers_session_created_idx
on public.interview_answers (session_id, created_at desc);

create index if not exists interview_reports_session_idx
on public.interview_reports (session_id);
