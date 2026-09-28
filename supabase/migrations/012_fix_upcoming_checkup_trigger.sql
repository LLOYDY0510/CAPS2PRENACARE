-- =============================================================================
-- 012_fix_upcoming_checkup_trigger.sql
--
-- Fixes: ERROR: record "new" has no field "pregnant_mother_id"
--
-- Root cause
--   public.notify_upcoming_checkup() is executed by notify_upcoming_checkup_trigger
--   (after insert on public.prenatal_schedules), but it reads NEW.pregnant_mother_id
--   and NEW.scheduled_checkup_date. prenatal_schedules has neither column:
--     live columns -> id, visit_date, reminder_sent, reminder_sent_at, set_by,
--                     created_at, status, missed_follow_up_sent, trimester
--   A mother is never stored on the schedule row; the link lives in
--   prenatal_schedule_recipients(schedule_id -> prenatal_schedules.id,
--                                pregnant_mother_id -> pregnant_mothers.id).
--   Every INSERT into prenatal_schedules therefore failed with SQLSTATE 42703,
--   which blocks ScheduleSetter (components/schedule/ScheduleSetter.tsx).
--
-- Fix
--   The function no longer reads a mother from NEW. It resolves the mothers
--   through the existing junction table + foreign keys and posts one
--   schedule-level alert for the BHW head, exactly one alert per schedule as
--   before. Per-mother notifications to the mothers themselves are unchanged:
--   they are already sent by the app through /api/notifications/dispatch
--   (app/api/notifications/dispatch/route.ts, event key appointment:<schedule>:<mother>).
--
-- Verified against the live database before writing this migration:
--   * INSERT into prenatal_schedules -> 400 {"code":"42703",
--     "message":"record \"new\" has no field \"pregnant_mother_id\""}
--   * maternal_notifications.pregnant_mother_id accepts NULL
--   * maternal_notifications.event_key is unique (ON CONFLICT is safe)
-- =============================================================================

create or replace function public.notify_upcoming_checkup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient_count integer;
  v_mother_summary text;
begin
  if tg_op <> 'INSERT' then
    return new;
  end if;

  -- Resolve the mothers of this schedule through the junction table.
  select count(*)::integer,
         string_agg(
           pm.full_name || ' (' || coalesce(pm.risk_level, 'unknown') || ')',
           ', ' order by pm.full_name
         )
  into v_recipient_count, v_mother_summary
  from public.prenatal_schedule_recipients psr
  join public.pregnant_mothers pm on pm.id = psr.pregnant_mother_id
  where psr.schedule_id = new.id;

  insert into public.maternal_notifications (
    pregnant_mother_id,
    event_key,
    category,
    title,
    message,
    recipient_role,
    recipient_purok,
    recipient_user_id
  )
  values (
    null,
    'upcoming_checkup_' || new.id::text,
    'appointment',
    'Upcoming Prenatal Checkup',
    case
      when v_recipient_count = 0 then
        format(
          'A prenatal checkup was scheduled for %s.',
          coalesce(new.visit_date::text, 'an unscheduled date')
        )
      else
        format(
          'A prenatal checkup is scheduled for %s: %s.',
          coalesce(new.visit_date::text, 'an unscheduled date'),
          v_mother_summary
        )
    end,
    'bhw_head',
    null,
    null
  )
  on conflict (event_key) do nothing;

  return new;
end;
$$;

drop trigger if exists notify_upcoming_checkup_trigger on public.prenatal_schedules;
create trigger notify_upcoming_checkup_trigger
  after insert on public.prenatal_schedules
  for each row execute function public.notify_upcoming_checkup();

-- -----------------------------------------------------------------------------
-- Not changed here, but worth knowing about:
--   public.notify_missed_checkup() (after insert or update on prenatal_checkups)
--   reads OLD.status, which is unassigned on INSERT. It is safe today only
--   because PL/pgSQL short-circuits `new.status = 'missed' and (old.status ...)`.
--   Inserting a checkup with status 'missed' directly would raise
--   "record \"old\" is not assigned yet". Same class of bug, different table.
--
-- Verify the repair with:
--   select tgname, pg_get_triggerdef(t.oid)
--   from pg_trigger t
--   where tgrelid = 'public.prenatal_schedules'::regclass
--     and not tgisinternal;
-- -----------------------------------------------------------------------------
