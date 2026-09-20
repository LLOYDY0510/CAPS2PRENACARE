alter table public.pregnant_mothers
  add column if not exists date_of_birth date;

create index if not exists pregnant_mothers_date_of_birth_idx
  on public.pregnant_mothers(date_of_birth);