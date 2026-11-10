-- Sequential visit progression based on records, with no LMP/EDD dependency.
-- Implements the stated final-flow rule (described as migration 039):
-- 1st v1 -> v2 -> v3 -> 2nd v1 ... -> 3rd v3. Missed visits are marked
-- but do not block scheduling the next slot. Existing entry points kept.

create or replace function public.visit_slot_order(trimester_value text, visit_value integer)
returns integer language sql immutable set search_path = public as $$
  select case trimester_value when '1st' then 0 when '2nd' then 3 else 6 end + visit_value;
$$;

-- True when a slot has a completed checkup (direct or via schedule link).
create or replace function public.visit_slot_completed(mother_uuid uuid, trimester_value text, visit_value integer)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.prenatal_checkups c
      left join public.prenatal_schedules s on s.id = c.schedule_id
    where c.pregnant_mother_id = mother_uuid
      and coalesce(c.trimester, s.trimester) = trimester_value
      and coalesce(c.visit_number, s.visit_number) = visit_value
      and (c.status = 'completed' or c.actual_checkup_date is not null)
  );
$$;

-- True when a non-cancelled assignment exists (scheduled, missed, completed).
create or replace function public.visit_slot_assigned(mother_uuid uuid, trimester_value text, visit_value integer, exclude_uuid uuid default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.prenatal_schedule_recipients r
      join public.prenatal_schedules s on s.id = r.schedule_id
    where r.pregnant_mother_id = mother_uuid
      and s.trimester = trimester_value and s.visit_number = visit_value
      and s.status <> 'cancelled'
      and (exclude_uuid is null or s.id <> exclude_uuid)
  );
$$;

-- First slot in order with neither completion nor active assignment.
create or replace function public.next_pending_visit(mother_uuid uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  slot record;
begin
  for slot in
    select t.tri as trimester, v.number as visit,
      public.visit_slot_order(t.tri, v.number) as slot_order
    from (values ('1st'), ('2nd'), ('3rd')) t(tri)
    cross join generate_series(1, 3) v(number)
    order by 3
  loop
    if not public.visit_slot_completed(mother_uuid, slot.trimester, slot.visit)
      and not public.visit_slot_assigned(mother_uuid, slot.trimester, slot.visit) then
      return jsonb_build_object('trimester', slot.trimester, 'visit', slot.visit, 'order', slot.slot_order);
    end if;
  end loop;
  return null;
end;
$$;

-- Sequential eligibility: prior slots need a record (completed, scheduled,
-- or missed). LMP/EDD and current-trimester checks are intentionally gone.
create or replace function public.prenatal_visit_eligibility(mother_uuid uuid, visit_day date, trimester_value text, visit_value integer, exclude_uuid uuid default null)
returns text language plpgsql volatile security definer set search_path = public as $$
declare
  mother public.pregnant_mothers;
  today date := (now() at time zone 'Asia/Manila')::date;
  requested_order integer;
  slot record;
  pending jsonb;
begin
  if visit_day is null or trimester_value is null or trimester_value not in ('1st', '2nd', '3rd')
    or visit_value is null or visit_value not between 1 and 3 then
    return 'Choose a trimester, visit and date first.';
  end if;
  select * into mother from public.pregnant_mothers where id = mother_uuid;
  if not found then return 'Maternal record is unavailable.'; end if;
  if exists(select 1 from public.prenatal_schedule_recipients r join public.prenatal_schedules s on s.id = r.schedule_id
    where r.schedule_id = exclude_uuid and r.pregnant_mother_id = mother_uuid
      and s.trimester = trimester_value and s.visit_number = visit_value and s.status <> 'cancelled') then
    return null;
  end if;
  if visit_day < today then return 'The visit date cannot be in the past.'; end if;
  if public.visit_slot_completed(mother_uuid, trimester_value, visit_value) then
    return 'This visit is already completed.';
  end if;
  if public.visit_slot_assigned(mother_uuid, trimester_value, visit_value, exclude_uuid) then
    return 'This visit is already assigned. Edit or cancel that assignment.';
  end if;
  requested_order := public.visit_slot_order(trimester_value, visit_value);
  for slot in
    select t.tri as trimester, v.number as visit,
      public.visit_slot_order(t.tri, v.number) as slot_order
    from (values ('1st'), ('2nd'), ('3rd')) t(tri)
    cross join generate_series(1, 3) v(number)
    where public.visit_slot_order(t.tri, v.number) < requested_order
    order by 3
  loop
    if not public.visit_slot_completed(mother_uuid, slot.trimester, slot.visit)
      and not public.visit_slot_assigned(mother_uuid, slot.trimester, slot.visit) then
      pending := public.next_pending_visit(mother_uuid);
      return 'Complete or schedule earlier visits first.'
        || coalesce(' Next pending: ' || (pending->>'trimester') || ' Trimester Visit ' || (pending->>'visit') || '.', '');
    end if;
  end loop;
  return null;
end;
$$;

-- Planning rows keep their shape and gain nextPending per mother.
create or replace function public.schedule_planning_rows(mode_value text, query_value text default '', zone_value text default '', trimester_value text default null, visit_value integer default null, visit_day date default null, exclude_uuid uuid default null, offset_value integer default 0, limit_value integer default 25)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb; today date := (now() at time zone 'Asia/Manila')::date;
begin
  if public.current_user_role() is distinct from 'admin' then raise exception 'Admin access required' using errcode = '42501'; end if;
  if mode_value not in ('eligibility', 'checklist') or mode_value is null or offset_value is null or offset_value < 0 or limit_value is null or limit_value not between 1 and 100 or length(coalesce(query_value, '')) > 120 then raise exception 'Invalid planning request' using errcode = '22023'; end if;
  if exclude_uuid is not null and not exists(select 1 from public.prenatal_schedules where id = exclude_uuid) then raise exception 'Schedule no longer exists' using errcode = '22023'; end if;
  with candidates as materialized (
    select m.id, m.full_name, m.serial_no, m.purok, m.contact_number,
      case when mode_value = 'eligibility' then public.prenatal_visit_eligibility(m.id, visit_day, trimester_value, visit_value, exclude_uuid) end reason,
      public.next_pending_visit(m.id) as next_pending
    from public.pregnant_mothers m where (coalesce(zone_value, '') = '' or m.purok = zone_value)
      and not exists(select 1 from regexp_split_to_table(public.normalize_table_search(query_value), '\s+') token
        where token <> '' and position(token in public.normalize_table_search(concat_ws(' ', m.full_name, m.serial_no, m.contact_number, 'zone ' || m.purok))) = 0)
  ), eligible as materialized(select * from candidates where mode_value = 'checklist' or reason is null),
  paged as materialized(select * from eligible order by full_name, id offset offset_value limit limit_value),
  slots as (
    select p.id mother_id, t.tri, v.number,
      (select jsonb_build_object('status', r.state, 'date', r.visit_date, 'scheduleId', r.schedule_id) from (
        select s.id schedule_id, s.visit_date as visit_date,
          case when s.status = 'completed' or c.status = 'completed' or c.actual_checkup_date is not null then 'completed'
            when s.status = 'cancelled' then 'cancelled' when s.status = 'missed' or c.status = 'missed' or s.visit_date < today then 'missed' else 'scheduled' end state,
          case when s.status = 'completed' or c.status = 'completed' or c.actual_checkup_date is not null then 0 when s.status = 'cancelled' then 2 else 1 end priority, s.created_at
        from public.prenatal_schedule_recipients a join public.prenatal_schedules s on s.id = a.schedule_id
          left join public.prenatal_checkups c on c.schedule_id = s.id and c.pregnant_mother_id = p.id
        where a.pregnant_mother_id = p.id and s.trimester = t.tri and s.visit_number = v.number
        union all
        select null, coalesce(c.actual_checkup_date, c.scheduled_for, c.checkup_date), 'completed', 0, c.created_at
          from public.prenatal_checkups c where c.pregnant_mother_id = p.id and c.schedule_id is null and c.trimester = t.tri and c.visit_number = v.number and (c.status = 'completed' or c.actual_checkup_date is not null)
      ) r order by r.priority, r.visit_date desc, r.created_at desc, r.schedule_id limit 1) cell
    from paged p cross join(values('1st'), ('2nd'), ('3rd')) t(tri) cross join generate_series(1, 3) v(number) where mode_value = 'checklist'
  )
  select jsonb_build_object('total', (select count(*) from eligible), 'needsReview', (select count(*) from candidates where reason = 'Pregnancy dating needs record review.'), 'updatedAt', now(),
    'rows', coalesce((select jsonb_agg(to_jsonb(p) - 'reason' - 'next_pending'
      || jsonb_build_object('nextPending', p.next_pending)
      || case when mode_value = 'checklist' then jsonb_build_object('visits', coalesce((select jsonb_object_agg(s.tri || ':' || s.number, coalesce(s.cell, jsonb_build_object('status', 'unscheduled', 'date', null, 'scheduleId', null))) from slots s where s.mother_id = p.id), '{}'::jsonb)) else '{}'::jsonb end order by p.full_name, p.id) from paged p), '[]'::jsonb)) into result;
  return result;
end;
$$;

revoke all on function public.visit_slot_order(text, integer), public.visit_slot_completed(uuid, text, integer), public.visit_slot_assigned(uuid, text, integer, uuid), public.next_pending_visit(uuid) from public, anon, authenticated;
grant execute on function public.visit_slot_order(text, integer), public.visit_slot_completed(uuid, text, integer), public.visit_slot_assigned(uuid, text, integer, uuid), public.next_pending_visit(uuid) to service_role;

-- Bisaya auto-templates, personalized per recipient. TS builders mirror these.
create or replace function public.schedule_confirmation_text(visit_day date, trimester_value text, visit_value integer, mother_name text)
returns text language sql immutable set search_path = public as $$
  select 'Nakatakda ang imong prenatal checkup, '||coalesce(nullif(trim(coalesce(mother_name,'')),'') ,'[Ngalan]')||': '||visit_day::text
    ||' sa Barangay Health Center ('||trimester_value||' Trimester, '
    ||case visit_value when 1 then '1st Visit' when 2 then '2nd Visit' else '3rd Visit' end
    ||'). Palihug adto sa sakto nga adlaw. Salamat!';
$$;
create or replace function public.schedule_confirmation_text(visit_day date, trimester_value text, visit_value integer)
returns text language sql immutable set search_path = public as $$
  select public.schedule_confirmation_text(visit_day, trimester_value, visit_value, '[Ngalan]');
$$;
revoke all on function public.schedule_confirmation_text(date, text, integer, text) from public, anon, authenticated;
grant execute on function public.schedule_confirmation_text(date, text, integer, text) to service_role;

-- Same entry point as 035; confirmation intents now carry the mother's name.
create or replace function public.save_schedule_with_confirmation(
  request_uuid uuid, visit_day date, trimester_value text, visit_value integer,
  recipient_ids uuid[], notes_value text, actor_uuid uuid
) returns uuid language plpgsql security definer set search_path = public as $$
declare target uuid; prior public.schedule_creation_requests; fingerprint_value text; recipients uuid[];
begin
  if request_uuid is null then raise exception 'A schedule request identity is required'; end if;
  select array_agg(distinct id order by id) into recipients from unnest(recipient_ids) id;
  fingerprint_value := md5(coalesce(visit_day::text, '')||'|'||coalesce(trimester_value, '')||'|'
    ||coalesce(visit_value::text, '')||'|'||coalesce(recipients::text, '')||'|'||coalesce(notes_value, ''));
  perform pg_advisory_xact_lock(hashtextextended(request_uuid::text, 0));
  select * into prior from public.schedule_creation_requests where id = request_uuid;
  if found then
    if prior.fingerprint <> fingerprint_value then
      raise exception 'This request was already saved with different details. Reload the schedules before saving again.';
    end if;
    return prior.schedule_id;
  end if;
  target := public.save_prenatal_schedule_visit(null, visit_day, trimester_value, visit_value, recipient_ids, notes_value, actor_uuid, 'scheduled');
  insert into public.schedule_creation_requests(id, actor_id, schedule_id, fingerprint)
  values(request_uuid, actor_uuid, target, fingerprint_value);
  insert into public.maternal_sms_events(event_key, pregnant_mother_id, schedule_id, message, message_type, created_by)
  select 'schedule-created:'||target, m.id, target,
    public.schedule_confirmation_text(visit_day, trimester_value, visit_value, m.full_name), 'care_message', actor_uuid
  from public.pregnant_mothers m where m.id = any(recipients)
  on conflict(event_key, pregnant_mother_id) do nothing;
  return target;
end;
$$;

-- Bisaya registration SMS with the mother's name and serial number.
create or replace function public.queue_registration_sms()
returns trigger language plpgsql security definer set search_path = public as $$
declare mother public.pregnant_mothers;
begin
  select * into strict mother from public.pregnant_mothers where id = new.mother_id;
  if mother.created_at is distinct from transaction_timestamp() or mother.registered_by is distinct from new.actor_id then
    return new;
  end if;
  insert into public.maternal_sms_events(event_key, pregnant_mother_id, message, message_type, created_by)
  values('registration:'||mother.id, mother.id,
    'Narehistro ka na sa maternal care program, '||coalesce(nullif(trim(coalesce(mother.full_name, '')), ''), 'Nanay')
    ||'! Ang imong record number kay '||mother.serial_no||'. Palihug kontaka ang imong BHW para sa prenatal nga pag-atiman. Salamat!',
    'care_message', new.actor_id) on conflict(event_key, pregnant_mother_id) do nothing;
  return new;
end;
$$;
notify pgrst, 'reload schema';
