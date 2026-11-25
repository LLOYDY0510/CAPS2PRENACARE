-- Reason-coded EDC overrides: an EDC that differs from LMP+280 must carry one of five reasons.
-- Deploy ordering: apply this migration BEFORE the app code that sends edd_override_reason
-- (the update RPC allowlist rejects unknown fields until then).
alter table public.pregnant_mothers add column if not exists edd_override_reason text;
alter table public.pregnant_mothers drop constraint if exists pregnant_mothers_edd_reason_check;
alter table public.pregnant_mothers add constraint pregnant_mothers_edd_reason_check
  check (edd_override_reason is null or edd_override_reason in
    ('ultrasound_1st','ultrasound_2nd','irregular_lmp','obgyn_reassessment','data_correction'));

create or replace function public.register_mother(request_uuid uuid,mother_data jsonb,indicator_ids uuid[] default '{}')
returns public.pregnant_mothers language plpgsql security invoker set search_path=public as $$
declare p public.profiles; saved public.pregnant_mothers; ids uuid[]; fingerprint_value text; prior public.maternal_registration_requests;
  zone text; age_value integer; gravida integer; para integer; reason_code text;
begin
  select * into p from public.profiles where id=auth.uid();
  if public.current_user_role() is distinct from 'bhw' or p.account_status is distinct from 'active' then
    raise exception 'An active BHW account is required' using errcode='42501';
  end if;
  zone:=regexp_replace(trim(coalesce(mother_data->>'purok','')),'^(Zone|Purok)\s*','', 'i');
  if zone !~ '^[1-8]$' then raise exception 'Choose a valid zone (1–8)'; end if;
  if not p.access_all_zones and (p.purok is null or p.purok<>zone) then
    raise exception 'Choose your assigned zone. Contact an administrator if your assignment is missing or incorrect.' using errcode='42501';
  end if;
  if nullif(trim(mother_data->>'first_name'),'') is null or nullif(trim(mother_data->>'last_name'),'') is null then
    raise exception 'First and last name are required';
  end if;
  if nullif(mother_data->>'waist_cm','') is not null and (mother_data->>'waist_cm')::numeric<=0 then raise exception 'Waist Line must be greater than zero';end if;
  reason_code:=nullif(trim(mother_data->>'edd_override_reason'),'');
  if reason_code is not null and reason_code<>all(array['ultrasound_1st','ultrasound_2nd','irregular_lmp','obgyn_reassessment','data_correction']) then raise exception 'Choose a valid reason for the EDC change';end if;
  if nullif(mother_data->>'edd','') is not null
    and (nullif(mother_data->>'lmp','') is null or (mother_data->>'lmp')::date+280<>(mother_data->>'edd')::date)
    and reason_code is null then raise exception 'Changing the EDC from the LMP-based date requires a reason';end if;
  if reason_code is not null and nullif(mother_data->>'edd','') is not null and nullif(mother_data->>'lmp','') is not null
    and (mother_data->>'lmp')::date+280=(mother_data->>'edd')::date then raise exception 'Remove the EDC reason when the date matches the LMP-based date';end if;
  age_value:=nullif(mother_data->>'age','')::integer;
  gravida:=nullif(mother_data->>'gravida','')::integer;para:=nullif(mother_data->>'para','')::integer;
  if age_value is not null and age_value not between 10 and 55 then raise exception 'Age must be between 10 and 55'; end if;
  if gravida<0 or para<0 or para>gravida then raise exception 'Invalid gravida and para'; end if;
  if exists(select 1 from unnest(indicator_ids) i where not exists(
    select 1 from public.risk_indicators r where r.id=i and r.active and r.indicator_type='checklist')) then
    raise exception 'Selected risk indicators have changed. Reload and review the form.';
  end if;
  select coalesce(array_agg(distinct r.id order by r.id),'{}') into ids from public.risk_indicators r where r.active and
    (r.id=any(indicator_ids) or (r.indicator_type='age_below' and age_value<r.threshold_value)
    or(r.indicator_type='first_pregnancy_age_above' and gravida=1 and age_value>=r.threshold_value));
  fingerprint_value:=md5(mother_data::text||ids::text);
  perform pg_advisory_xact_lock(hashtextextended(request_uuid::text,0));
  select * into prior from public.maternal_registration_requests where id=request_uuid;
  if found then
    if prior.fingerprint<>fingerprint_value then raise exception 'This request was already saved with different details. Reload the registry before registering again.'; end if;
    select * into saved from public.pregnant_mothers where id=prior.mother_id;
    return saved;
  end if;
  insert into public.pregnant_mothers(date_registered,first_name,middle_name,last_name,full_name,address,purok,age,contact_number,lmp,
    gravida_para,edd,edd_override_reason,blood_pressure,waist_cm,height_cm,weight_kg,latitude,longitude,risk_level,registered_by)
  values((mother_data->>'date_registered')::date,trim(mother_data->>'first_name'),nullif(trim(mother_data->>'middle_name'),''),
    trim(mother_data->>'last_name'),concat_ws(' ',trim(mother_data->>'first_name'),nullif(trim(mother_data->>'middle_name'),''),trim(mother_data->>'last_name')),
    nullif(mother_data->>'address',''),zone,age_value,nullif(mother_data->>'contact_number',''),nullif(mother_data->>'lmp','')::date,
    case when gravida is not null and para is not null then 'G'||gravida||'P'||para end,nullif(mother_data->>'edd','')::date,reason_code,
    nullif(mother_data->>'blood_pressure',''),nullif(mother_data->>'waist_cm','')::numeric,nullif(mother_data->>'height_cm','')::numeric,nullif(mother_data->>'weight_kg','')::numeric,
    nullif(mother_data->>'latitude','')::double precision,nullif(mother_data->>'longitude','')::double precision,
    case when cardinality(ids)>0 then 'high' else 'low' end,auth.uid()) returning * into saved;
  insert into public.pregnant_mother_indicators(pregnant_mother_id,indicator_id) select saved.id,unnest(ids);
  insert into public.maternal_registration_requests(id,actor_id,mother_id,fingerprint) values(request_uuid,auth.uid(),saved.id,fingerprint_value);
  return saved;
end;
$$;
revoke all on function public.register_mother(uuid,jsonb,uuid[]) from public,anon,authenticated;
grant execute on function public.register_mother(uuid,jsonb,uuid[]) to authenticated;

create or replace function public.update_maternal_record(
  mother_uuid uuid,expected_record jsonb,expected_indicator_ids uuid[],mother_data jsonb,
  indicator_ids uuid[],review_assessment boolean default false
) returns public.pregnant_mothers language plpgsql security invoker set search_path=public as $$
declare
  actor public.profiles; saved public.pregnant_mothers; result public.pregnant_mothers;
  current_ids uuid[]; chosen uuid[]; keep_ids uuid[]; zone text; key text; numeric_value numeric;
  old_data jsonb; limits record; recalculate boolean; assessment text; gravida integer; para integer; reason_code text;
begin
  select * into actor from public.profiles where id=auth.uid();
  if actor.role is distinct from 'bhw' or actor.account_status is distinct from 'active' then
    raise exception 'An active BHW account is required' using errcode='42501';
  end if;
  select * into saved from public.pregnant_mothers where id=mother_uuid for update;
  if not found or (actor.access_all_zones is not true and (actor.purok is null or actor.purok<>saved.purok)) then
    raise exception 'Record not found or not permitted' using errcode='42501';
  end if;
  select coalesce(array_agg(indicator_id order by indicator_id),'{}') into current_ids from public.pregnant_mother_indicators where pregnant_mother_id=mother_uuid;
  if expected_record is distinct from to_jsonb(saved) or current_ids is distinct from
    (select coalesce(array_agg(distinct id order by id),'{}') from unnest(expected_indicator_ids) id) then
    raise exception 'This record changed since you opened it. Reload the record before saving.' using errcode='40001';
  end if;
  if jsonb_typeof(mother_data) is distinct from 'object' or review_assessment is null or indicator_ids is null or cardinality(indicator_ids)>100 or exists(select 1 from unnest(indicator_ids) id where id is null) then raise exception 'Invalid update request';end if;
  if exists(select 1 from jsonb_object_keys(mother_data) k where k<>all(array['date_registered','first_name','middle_name','last_name','address','purok','age','contact_number','lmp','gravida','para','edd','edd_override_reason','blood_pressure','waist_cm','height_cm','weight_kg','latitude','longitude'])) then raise exception 'Unexpected record field';end if;
  foreach key in array array['date_registered','first_name','middle_name','last_name','address','purok','contact_number','lmp','edd','edd_override_reason','blood_pressure'] loop
    if mother_data?key and jsonb_typeof(mother_data->key) not in('string','null') then raise exception 'Invalid %',key;end if;
  end loop;
  zone:=regexp_replace(trim(coalesce(mother_data->>'purok','')),'^(Zone|Purok)\s*','','i');
  if zone!~'^[1-8]$' or (actor.access_all_zones is not true and actor.purok is distinct from zone) then raise exception 'Choose your assigned zone' using errcode='42501';end if;
  foreach key in array array['first_name','last_name'] loop
    if nullif(trim(mother_data->>key),'') is null or length(mother_data->>key)>150 then raise exception 'First and last name are required (maximum 150 characters)';end if;
  end loop;
  foreach key in array array['middle_name','address','contact_number','blood_pressure'] loop
    if length(mother_data->>key)>1000 then raise exception 'Invalid patient information';end if;
  end loop;
  old_data:=to_jsonb(saved)||jsonb_build_object(
    'gravida',substring(saved.gravida_para from '^G([0-9]+)P[0-9]+$'),
    'para',substring(saved.gravida_para from '^G[0-9]+P([0-9]+)$'));
  foreach key in array array['date_registered','lmp','edd'] loop
    if nullif(mother_data->>key,'') is not null and ((mother_data->>key)!~'^\d{4}-\d{2}-\d{2}$' or to_char((mother_data->>key)::date,'YYYY-MM-DD')<>mother_data->>key) then raise exception 'Provide valid dates';end if;
  end loop;
  if (nullif(mother_data->>'date_registered','')::date is distinct from saved.date_registered) and
    (nullif(mother_data->>'date_registered','') is null or (mother_data->>'date_registered')::date>current_date) then raise exception 'Provide a valid registration date';end if;
  reason_code:=nullif(trim(mother_data->>'edd_override_reason'),'');
  if reason_code is not null and reason_code<>all(array['ultrasound_1st','ultrasound_2nd','irregular_lmp','obgyn_reassessment','data_correction']) then raise exception 'Choose a valid reason for the EDC change';end if;
  if nullif(mother_data->>'edd','')::date is distinct from saved.edd or reason_code is distinct from saved.edd_override_reason then
    if nullif(mother_data->>'edd','') is not null
      and (nullif(mother_data->>'lmp','') is null or (mother_data->>'lmp')::date+280<>(mother_data->>'edd')::date)
      and reason_code is null then raise exception 'Changing the EDC from the LMP-based date requires a reason';end if;
    if reason_code is not null and nullif(mother_data->>'edd','') is not null and nullif(mother_data->>'lmp','') is not null
      and (mother_data->>'lmp')::date+280=(mother_data->>'edd')::date then raise exception 'Remove the EDC reason when the date matches the LMP-based date';end if;
  end if;
  for limits in select * from (values('age',10::numeric,55::numeric),('gravida',0,30),('para',0,30),('height_cm',50,250),('weight_kg',1,300),('latitude',-90,90),('longitude',-180,180),('waist_cm',0,'Infinity'::numeric)) as ranges(field,minimum,maximum) loop
    if nullif(mother_data->>limits.field,'') is not null then
      numeric_value:=(mother_data->>limits.field)::numeric;
      if numeric_value in('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric) then raise exception 'Invalid measurement';end if;
      if nullif(mother_data->>limits.field,'') is distinct from nullif(old_data->>limits.field,'') and
        (numeric_value<limits.minimum or numeric_value>limits.maximum or (limits.field in('age','gravida','para') and numeric_value<>trunc(numeric_value))) then raise exception 'Invalid %',limits.field;end if;
      if limits.field='waist_cm' and numeric_value<=0 then raise exception 'Waist Line must be greater than zero';end if;
    end if;
  end loop;
  if (nullif(mother_data->>'latitude','') is null)<>(nullif(mother_data->>'longitude','') is null) and
    (nullif(mother_data->>'latitude','') is distinct from old_data->>'latitude' or nullif(mother_data->>'longitude','') is distinct from old_data->>'longitude') then raise exception 'Provide both latitude and longitude';end if;
  if nullif(mother_data->>'blood_pressure','') is distinct from saved.blood_pressure and nullif(mother_data->>'blood_pressure','') is not null then
    if (mother_data->>'blood_pressure')!~'^[0-9]{2,3}/[0-9]{2,3}$' then raise exception 'Invalid blood pressure';end if;
    if split_part(mother_data->>'blood_pressure','/',1)::int<=split_part(mother_data->>'blood_pressure','/',2)::int or split_part(mother_data->>'blood_pressure','/',1)::int>250 or split_part(mother_data->>'blood_pressure','/',2)::int>150 then raise exception 'Invalid blood pressure';end if;
  end if;
  gravida:=nullif(mother_data->>'gravida','')::integer;para:=nullif(mother_data->>'para','')::integer;
  if (gravida is null)<>(para is null) then raise exception 'Provide both Gravida and Para';end if;
  if para>gravida then raise exception 'Para cannot be greater than Gravida';end if;
  if review_assessment then
    if exists(select 1 from unnest(indicator_ids) i where not exists(select 1 from public.risk_indicators r where r.id=i and r.active and r.indicator_type='checklist') and not i=any(current_ids)) then raise exception 'Risk indicators changed. Reload and review the selections.';end if;
  elsif (select coalesce(array_agg(distinct id order by id),'{}') from unnest(indicator_ids) id) is distinct from current_ids then
    raise exception 'Review the assessment before changing checklist selections';
  end if;
  recalculate:=review_assessment or nullif(mother_data->>'age','')::integer is distinct from saved.age
    or nullif(mother_data->>'gravida','') is distinct from nullif(old_data->>'gravida','');
  assessment:=saved.risk_level;
  if recalculate then
    select coalesce(array_agg(r.id),'{}') into chosen from public.risk_indicators r where r.active and
      ((r.indicator_type='checklist' and r.id=any(indicator_ids))
       or(r.indicator_type='age_below' and nullif(mother_data->>'age','')::integer<r.threshold_value)
       or(r.indicator_type='first_pregnancy_age_above' and gravida=1 and nullif(mother_data->>'age','')::integer>=r.threshold_value));
    select coalesce(array_agg(i.indicator_id),'{}') into keep_ids from public.pregnant_mother_indicators i join public.risk_indicators r on r.id=i.indicator_id where i.pregnant_mother_id=mother_uuid and not r.active;
    delete from public.pregnant_mother_indicators where pregnant_mother_id=mother_uuid and not indicator_id=any(chosen||keep_ids);
    insert into public.pregnant_mother_indicators(pregnant_mother_id,indicator_id) select mother_uuid,unnest(chosen) on conflict do nothing;
    assessment:=case when cardinality(chosen)>0 then 'high' when saved.risk_level is null and not review_assessment then null else 'low' end;
  end if;
  update public.pregnant_mothers set
    date_registered=nullif(mother_data->>'date_registered','')::date,
    first_name=trim(mother_data->>'first_name'),middle_name=nullif(trim(mother_data->>'middle_name'),''),last_name=trim(mother_data->>'last_name'),
    full_name=concat_ws(' ',trim(mother_data->>'first_name'),nullif(trim(mother_data->>'middle_name'),''),trim(mother_data->>'last_name')),
    address=nullif(mother_data->>'address',''),purok=zone,age=nullif(mother_data->>'age','')::integer,
    contact_number=nullif(mother_data->>'contact_number',''),lmp=nullif(mother_data->>'lmp','')::date,edd=nullif(mother_data->>'edd','')::date,edd_override_reason=reason_code,
    gravida_para=case when gravida is not null and para is not null then 'G'||gravida||'P'||para when gravida is null and para is null and coalesce(saved.gravida_para,'')!~'^G[0-9]+P[0-9]+$' then saved.gravida_para else null end,
    blood_pressure=nullif(mother_data->>'blood_pressure',''),waist_cm=nullif(mother_data->>'waist_cm','')::numeric,
    height_cm=nullif(mother_data->>'height_cm','')::numeric,weight_kg=nullif(mother_data->>'weight_kg','')::numeric,
    latitude=nullif(mother_data->>'latitude','')::double precision,longitude=nullif(mother_data->>'longitude','')::double precision,risk_level=assessment
  where id=mother_uuid returning * into result;
  return result;
end;$$;
revoke all on function public.update_maternal_record(uuid,jsonb,uuid[],jsonb,uuid[],boolean) from public,anon,authenticated;
grant execute on function public.update_maternal_record(uuid,jsonb,uuid[],jsonb,uuid[],boolean) to authenticated;

notify pgrst,'reload schema';
