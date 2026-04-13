-- RELENTLESS — Phase 1 Schema
-- Migration: 001_initial_schema
-- Tables: users, goals, projects, tasks, task_check_ins
-- RLS enabled on all tables, scoped by auth.uid()

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists "uuid-ossp";


-- ============================================================
-- users
-- ============================================================
create table public.users (
  id                      uuid primary key references auth.users(id) on delete cascade,
  email                   text not null,
  full_name               text,
  timezone                text not null default 'America/New_York',
  push_token              text,
  phone                   text,
  sms_opt_in              boolean not null default false,
  notification_intensity  text not null default 'intense'
                            check (notification_intensity in ('intense', 'moderate', 'quiet')),
  quiet_hours_start       time,   -- e.g. '22:00'
  quiet_hours_end         time,   -- e.g. '07:00'
  onboarding_complete     boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users: own row only"
  on public.users
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create user row on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_updated_at
  before update on public.users
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- goals
-- ============================================================
create table public.goals (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 uuid not null references public.users(id) on delete cascade,
  title                   text not null,
  description             text,
  target_date             date not null,
  status                  text not null default 'active'
                            check (status in ('active', 'complete', 'cancelled')),
  goal_type               text not null default 'quarterly'
                            check (goal_type in ('annual', 'quarterly', 'project')),
  ai_breakdown_metadata   jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

alter table public.goals enable row level security;

create policy "goals: own rows only"
  on public.goals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index goals_user_id_status_idx on public.goals(user_id, status);

create trigger goals_updated_at
  before update on public.goals
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- projects
-- ============================================================
create table public.projects (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  goal_id     uuid not null references public.goals(id) on delete cascade,
  title       text not null,
  description text,
  status      text not null default 'active'
                check (status in ('active', 'complete', 'cancelled')),
  target_date date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "projects: own rows only"
  on public.projects
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index projects_user_id_goal_id_idx on public.projects(user_id, goal_id);

create trigger projects_updated_at
  before update on public.projects
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- tasks
-- ============================================================
create table public.tasks (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null references public.users(id) on delete cascade,
  project_id         uuid references public.projects(id) on delete set null,
  goal_id            uuid references public.goals(id) on delete set null,
  title              text not null,
  description        text,
  status             text not null default 'not_started'
                       check (status in ('not_started', 'in_progress', 'blocked', 'complete', 'cancelled')),
  priority           smallint not null default 2
                       check (priority between 1 and 4),  -- 1 = highest
  due_date           timestamptz,
  start_date         timestamptz,
  estimated_minutes  integer check (estimated_minutes > 0),
  actual_minutes     integer check (actual_minutes >= 0),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "tasks: own rows only"
  on public.tasks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Indexes to support Today view and escalation sweep queries
create index tasks_user_due_status_idx on public.tasks(user_id, due_date, status);
create index tasks_user_status_idx     on public.tasks(user_id, status);

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- task_check_ins  (append-only audit log — no updates)
-- ============================================================
create table public.task_check_ins (
  id                  uuid primary key default uuid_generate_v4(),
  task_id             uuid not null references public.tasks(id) on delete cascade,
  user_id             uuid not null references public.users(id) on delete cascade,
  action              text not null
                        check (action in (
                          'status_change', 'snooze', 'reschedule',
                          'complete', 'help_request', 'note'
                        )),
  previous_status     text,
  new_status          text,
  previous_due_date   timestamptz,
  new_due_date        timestamptz,
  reschedule_reason   text,
  note                text,
  created_at          timestamptz not null default now()
);

alter table public.task_check_ins enable row level security;

create policy "task_check_ins: own rows only"
  on public.task_check_ins
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index task_check_ins_task_id_idx on public.task_check_ins(task_id);
create index task_check_ins_user_id_idx on public.task_check_ins(user_id, created_at desc);
