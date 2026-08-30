create table public.planner_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint planner_state_is_object check (jsonb_typeof(state) = 'object')
);

alter table public.planner_state enable row level security;

revoke all on table public.planner_state from anon, authenticated;
grant select, insert, update on table public.planner_state to authenticated;

create policy "Users can read their planner state"
on public.planner_state
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their planner state"
on public.planner_state
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their planner state"
on public.planner_state
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);