-- =============================================================================
-- 013_rls_hardening.sql
-- Authoritative row-level security for every PrenaTrack table.
--
-- Why this migration exists (all verified against the live database)
--
-- 1. 006_bhw_purok_rls.sql could never complete. Its policies reference
--    prenatal_schedules.pregnant_mother_id, a column that does not exist
--    (a schedule is not tied to one mother; the link is
--    prenatal_schedule_recipients). Postgres validates policy expressions at
--    creation time, so `create policy` raised
--    "column prenatal_schedules.pregnant_mother_id does not exist" and every
--    statement after it never ran. The result on the live database:
--      * a user with role 'pending' could read ALL rows of
--        pregnant_mothers, prenatal_schedules, prenatal_schedule_recipients,
--        risk_indicators, monthly_tips, tip_broadcasts,
--        tip_broadcast_recipients, pregnant_mother_indicators
--        (measured with a throwaway authenticated account: 2/2 mothers,
--        4/4 schedules, 5/5 recipient links, 16/16 indicators, 18/18 tips);
--      * maternal_health_history / maternal_referrals / prenatal_follow_ups
--        were left with the permissive "authenticated users can read ... using
--        (true)" policies from 001 - any signed-in user could read every
--        mother's clinical history and referrals;
--      * sms_logs had no policies at all.
--
-- 2. public.profiles had no RLS at all. Measured with a throwaway
--    'pending' account:
--        PATCH /rest/v1/profiles?id=eq.<self>  {"role":"admin"}  -> 204
--        PATCH /rest/v1/profiles?id=eq.<admin> {"role":"..."}    -> 204
--    i.e. any authenticated user could promote themselves, or demote the
--    administrator, to any role: full privilege escalation.
--
-- Fix strategy
--   * SECURITY DEFINER helper functions so policies stay short, fast and
--     immune to profiles' own RLS (no recursive policy evaluation).
--   * Every policy is dropped and recreated from scratch, so the final state
--     is complete and deterministic regardless of which older migration
--     managed to run. No table, column or row is dropped or rewritten.
--   * Role model, matching the application (utils/auth/permissions.ts):
--       admin  - everything
--       nurse  - all clinical data, health/nutrition tips, risk indicators
--       bhw_head - all clinical data, manages schedules and BHW assignments
--       bhw_purok - ONLY mothers in their assigned purok, read-only for
--                    schedules (app: canManageSchedules = false)
--       pregnant_mother - only her own records
--       pending - no clinical access at all
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Remaining schema gaps
-- -----------------------------------------------------------------------------
alter table public.prenatal_schedule_recipients
  add column if not exists created_at timestamptz not null default now();

-- /dashboard/sms-log selects profiles(full_name, email) from sms_logs, which
-- needs a foreign key: without it PostgREST answers
-- "Could not find a relationship between 'sms_logs' and 'profiles'" and the
-- page silently renders an empty log. Any auth user without a profile row is
-- inserted first so the constraint stays valid.
insert into public.profiles (id, email, full_name, role)
select u.id, u.email, coalesce(u.raw_user_meta_data ->> 'full_name', u.email), 'pending'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.sms_logs'::regclass
      and contype = 'f'
      and confrelid = 'public.profiles'::regclass
  ) then
    alter table public.sms_logs
      add constraint sms_logs_sent_by_fkey
      foreign key (sent_by) references public.profiles(id) on delete set null;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 1. Policy helper functions (SECURITY DEFINER -> bypass profiles RLS safely)
-- -----------------------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.current_user_purok()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.purok from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.current_mother_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.pregnant_mother_id from public.profiles p where p.id = auth.uid();
$$;

-- admin / nurse / bhw_head: full clinical visibility
create or replace function public.is_clinical_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('admin', 'nurse', 'bhw_head');
$$;

-- any care staff including BHW purok
create or replace function public.is_care_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('admin', 'nurse', 'bhw_head', 'bhw_purok');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'admin';
$$;

-- Can the current user see this mother at all?
--   staff        -> yes
--   bhw_purok    -> only when she is in the BHW's assigned purok
--   mother       -> only her own record
create or replace function public.can_access_mother(mother_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_clinical_staff()
      or exists (
           select 1
           from public.pregnant_mothers pm
           where pm.id = mother_id
             and pm.purok = public.current_user_purok()
             and public.current_user_role() = 'bhw_purok'
         )
      or public.current_mother_id() = mother_id;
$$;

-- Can the current user modify this mother's records?
create or replace function public.can_manage_mother(mother_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_clinical_staff()
      or exists (
           select 1
           from public.pregnant_mothers pm
           where pm.id = mother_id
             and pm.purok = public.current_user_purok()
             and public.current_user_role() = 'bhw_purok'
         );
$$;

revoke all on function public.current_user_role() from public;
revoke all on function public.current_user_purok() from public;
revoke all on function public.current_mother_id() from public;
revoke all on function public.is_clinical_staff() from public;
revoke all on function public.is_care_staff() from public;
revoke all on function public.is_admin() from public;
-- Can the current user see / manage this notification row?
--   * addressed to the user directly      -> yes
--   * addressed to the user's role        -> yes for clinical staff
--   * tied to a mother record with no role -> yes for clinical staff (they own
--     the record-level notifications) and for that mother herself
create or replace function public.can_access_notification(
  row_recipient_user_id uuid,
  row_recipient_role text,
  row_mother_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select row_recipient_user_id = auth.uid()
      or (
           public.is_clinical_staff()
           and (row_recipient_role is null or row_recipient_role = public.current_user_role())
         )
      or (
           public.current_user_role() = 'pregnant_mother'
           and row_mother_id is not null
           and row_mother_id = public.current_mother_id()
         );
$$;

revoke all on function public.can_access_mother(uuid) from public;
revoke all on function public.can_manage_mother(uuid) from public;
revoke all on function public.can_access_notification(uuid, text, uuid) from public;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_purok() to authenticated;
grant execute on function public.current_mother_id() to authenticated;
grant execute on function public.is_clinical_staff() to authenticated;
grant execute on function public.is_care_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.can_access_mother(uuid) to authenticated;
grant execute on function public.can_manage_mother(uuid) to authenticated;
grant execute on function public.can_access_notification(uuid, text, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Clean slate: drop every existing policy, RLS on for all app tables
-- -----------------------------------------------------------------------------
do $$
declare
  target text;
  pol record;
begin
  foreach target in array array[
    'profiles',
    'pregnant_mothers',
    'prenatal_checkups',
    'prenatal_schedules',
    'prenatal_schedule_recipients',
    'prenatal_schedule_reminders',
    'prenatal_follow_ups',
    'maternal_health_history',
    'maternal_referrals',
    'maternal_notifications',
    'sms_logs',
    'risk_indicators',
    'monthly_tips',
    'tip_broadcasts',
    'tip_broadcast_recipients',
    'pregnant_mother_indicators'
  ] loop
    for pol in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = target
    loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, target);
    end loop;
    execute format('alter table public.%I enable row level security', target);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. profiles - a user may only read and lightly edit their own row.
--    Role, purok and pregnant_mother_id are administrable columns: they are
--    removed from the authenticated role's UPDATE grant so that no RLS gap can
--    ever be used for privilege escalation. They are written by the service
--    role through /api/admin/update-role and /api/admin/create-user.
-- -----------------------------------------------------------------------------
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- -----------------------------------------------------------------------------
-- 4. pregnant_mothers
-- -----------------------------------------------------------------------------
create policy "mothers_read"
  on public.pregnant_mothers for select to authenticated
  using (public.can_access_mother(id));

create policy "mothers_insert"
  on public.pregnant_mothers for insert to authenticated
  with check (
    public.is_clinical_staff()
    or (public.current_user_role() = 'bhw_purok' and purok = public.current_user_purok())
  );

create policy "mothers_update"
  on public.pregnant_mothers for update to authenticated
  using (
    public.is_clinical_staff()
    or (public.current_user_role() = 'bhw_purok' and purok = public.current_user_purok())
  )
  with check (
    public.is_clinical_staff()
    or (public.current_user_role() = 'bhw_purok' and purok = public.current_user_purok())
  );

create policy "mothers_delete"
  on public.pregnant_mothers for delete to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 5. prenatal_schedules - reachable through the recipients junction table
-- -----------------------------------------------------------------------------
create policy "schedules_read"
  on public.prenatal_schedules for select to authenticated
  using (
    public.is_clinical_staff()
    or exists (
      select 1
      from public.prenatal_schedule_recipients r
      where r.schedule_id = prenatal_schedules.id
        and public.can_access_mother(r.pregnant_mother_id)
    )
  );

-- Schedules are managed by admin / nurse / bhw_head only.
-- bhw_purok is view-only in the UI (canManageSchedules = false).
create policy "schedules_write"
  on public.prenatal_schedules for all to authenticated
  using (public.is_clinical_staff())
  with check (public.is_clinical_staff());

-- -----------------------------------------------------------------------------
-- 6. prenatal_schedule_recipients
-- -----------------------------------------------------------------------------
create policy "recipients_read"
  on public.prenatal_schedule_recipients for select to authenticated
  using (public.can_access_mother(pregnant_mother_id));

create policy "recipients_write"
  on public.prenatal_schedule_recipients for all to authenticated
  using (public.is_clinical_staff())
  with check (public.is_clinical_staff());

-- -----------------------------------------------------------------------------
-- 7. prenatal_checkups
-- -----------------------------------------------------------------------------
create policy "checkups_read"
  on public.prenatal_checkups for select to authenticated
  using (public.can_access_mother(pregnant_mother_id));

create policy "checkups_insert"
  on public.prenatal_checkups for insert to authenticated
  with check (
    public.can_manage_mother(pregnant_mother_id)
    and (recorded_by is null or recorded_by = auth.uid())
  );

create policy "checkups_update"
  on public.prenatal_checkups for update to authenticated
  using (public.can_manage_mother(pregnant_mother_id))
  with check (public.can_manage_mother(pregnant_mother_id));

create policy "checkups_delete"
  on public.prenatal_checkups for delete to authenticated
  using (public.can_manage_mother(pregnant_mother_id));

-- -----------------------------------------------------------------------------
-- 8. prenatal_schedule_reminders
-- -----------------------------------------------------------------------------
create policy "reminders_read"
  on public.prenatal_schedule_reminders for select to authenticated
  using (public.can_access_mother(pregnant_mother_id));

create policy "reminders_write"
  on public.prenatal_schedule_reminders for all to authenticated
  using (public.is_care_staff())
  with check (public.is_care_staff());

-- -----------------------------------------------------------------------------
-- 9. prenatal_follow_ups
-- -----------------------------------------------------------------------------
create policy "follow_ups_read"
  on public.prenatal_follow_ups for select to authenticated
  using (public.can_access_mother(pregnant_mother_id));

create policy "follow_ups_write"
  on public.prenatal_follow_ups for all to authenticated
  using (public.can_manage_mother(pregnant_mother_id))
  with check (public.can_manage_mother(pregnant_mother_id));

-- -----------------------------------------------------------------------------
-- 10. maternal_health_history and maternal_referrals
--     Replaces the "authenticated users can read ... using (true)" policies
--     from 001, which exposed every mother's clinical data to any signed-in
--     account.
-- -----------------------------------------------------------------------------
create policy "history_read"
  on public.maternal_health_history for select to authenticated
  using (public.can_access_mother(pregnant_mother_id));

create policy "history_write"
  on public.maternal_health_history for all to authenticated
  using (public.can_manage_mother(pregnant_mother_id))
  with check (public.can_manage_mother(pregnant_mother_id));

create policy "referrals_read"
  on public.maternal_referrals for select to authenticated
  using (public.can_access_mother(pregnant_mother_id));

create policy "referrals_write"
  on public.maternal_referrals for all to authenticated
  using (public.can_manage_mother(pregnant_mother_id))
  with check (public.can_manage_mother(pregnant_mother_id));

-- -----------------------------------------------------------------------------
-- 11. maternal_notifications
--     Staff notifications are addressed by role (or to one user); record-level
--     notifications created by utils/notifications.ts carry a
--     pregnant_mother_id and no recipient_role. A pregnant_mother can never
--     match on recipient_role, so a role-wide broadcast cannot leak across
--     patients, and she only ever matches her own record.
-- -----------------------------------------------------------------------------
create policy "notifications_read"
  on public.maternal_notifications for select to authenticated
  using (public.can_access_notification(recipient_user_id, recipient_role, pregnant_mother_id));

create policy "notifications_insert"
  on public.maternal_notifications for insert to authenticated
  with check (
    public.current_user_role() in ('admin', 'nurse', 'bhw_head')
    or (
      public.current_user_role() = 'pregnant_mother'
      and pregnant_mother_id = public.current_mother_id()
    )
  );

create policy "notifications_update"
  on public.maternal_notifications for update to authenticated
  using (public.can_access_notification(recipient_user_id, recipient_role, pregnant_mother_id))
  with check (public.can_access_notification(recipient_user_id, recipient_role, pregnant_mother_id));

-- -----------------------------------------------------------------------------
-- 12. sms_logs
--     Staff read the log; a BHW purok only sees the messages they sent.
-- -----------------------------------------------------------------------------
create policy "sms_logs_read"
  on public.sms_logs for select to authenticated
  using (
    public.current_user_role() in ('admin', 'nurse', 'bhw_head')
    or sent_by = auth.uid()
  );

create policy "sms_logs_insert"
  on public.sms_logs for insert to authenticated
  with check (public.is_care_staff());

create policy "sms_logs_update"
  on public.sms_logs for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 13. risk_indicators
-- -----------------------------------------------------------------------------
create policy "risk_indicators_read"
  on public.risk_indicators for select to authenticated
  using (public.is_care_staff());

create policy "risk_indicators_write"
  on public.risk_indicators for all to authenticated
  using (public.current_user_role() in ('admin', 'nurse'))
  with check (public.current_user_role() in ('admin', 'nurse'));

-- -----------------------------------------------------------------------------
-- 14. monthly_tips (nutrition tips) and tip_broadcasts (health tips)
-- -----------------------------------------------------------------------------
create policy "monthly_tips_read"
  on public.monthly_tips for select to authenticated
  using (public.is_care_staff());

create policy "monthly_tips_write"
  on public.monthly_tips for all to authenticated
  using (public.current_user_role() in ('admin', 'nurse'))
  with check (public.current_user_role() in ('admin', 'nurse'));

create policy "tip_broadcasts_read"
  on public.tip_broadcasts for select to authenticated
  using (public.is_care_staff());

create policy "tip_broadcasts_write"
  on public.tip_broadcasts for all to authenticated
  using (public.current_user_role() in ('admin', 'nurse'))
  with check (public.current_user_role() in ('admin', 'nurse'));

create policy "tip_broadcast_recipients_read"
  on public.tip_broadcast_recipients for select to authenticated
  using (public.can_access_mother(pregnant_mother_id));

create policy "tip_broadcast_recipients_write"
  on public.tip_broadcast_recipients for all to authenticated
  using (public.current_user_role() in ('admin', 'nurse'))
  with check (public.current_user_role() in ('admin', 'nurse'));

-- -----------------------------------------------------------------------------
-- 15. pregnant_mother_indicators
-- -----------------------------------------------------------------------------
create policy "mother_indicators_read"
  on public.pregnant_mother_indicators for select to authenticated
  using (public.can_access_mother(pregnant_mother_id));

create policy "mother_indicators_write"
  on public.pregnant_mother_indicators for all to authenticated
  using (public.can_manage_mother(pregnant_mother_id))
  with check (public.can_manage_mother(pregnant_mother_id));

-- -----------------------------------------------------------------------------
-- 16. Keep a unique key the application's upsert depends on
--     (utils/checkPrenatalReminders.ts upserts on schedule_id + mother id).
-- -----------------------------------------------------------------------------
create unique index if not exists prenatal_follow_ups_schedule_mother_idx
  on public.prenatal_follow_ups(schedule_id, pregnant_mother_id);

-- -----------------------------------------------------------------------------
-- 17. Reload PostgREST's schema cache
-- -----------------------------------------------------------------------------
notify pgrst, 'reload schema';

-- -----------------------------------------------------------------------------
-- Verify after running
--   -- no table should be readable by an account with role 'pending':
--   select tablename, policyname, cmd, roles from pg_policies
--    where schemaname = 'public' order by tablename, policyname;
--
--   -- every table must have RLS on:
--   select relname, relrowsecurity from pg_class
--    where relnamespace = 'public'::regnamespace and relkind = 'r'
--      and not relrowsecurity;
-- -----------------------------------------------------------------------------
