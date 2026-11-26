-- Editable tip references. Seeded once; nurse edits are never overwritten on re-apply.
create table if not exists public.tip_references (
  id uuid primary key default gen_random_uuid(),
  position integer not null check (position >= 1),
  citation text not null,
  constraint tip_references_position_unique unique (position)
);
alter table public.tip_references enable row level security;
revoke all on public.tip_references from public,anon,authenticated;
grant select,insert,update,delete on public.tip_references to service_role;
insert into public.tip_references(position,citation) values
(1,'[1] World Health Organization. WHO recommendations on antenatal care for a positive pregnancy experience. 2016.'),
(2,'[2] World Health Organization. WHO recommendations on antenatal care for a positive pregnancy experience: Highlights and key messages. 2018.'),
(3,'[3] World Health Organization. New guidelines on antenatal care for a positive pregnancy experience. 2016.'),
(4,'[4] American College of Obstetricians and Gynecologists. Bleeding During Pregnancy.'),
(5,'[5] American College of Obstetricians and Gynecologists. Urgent Maternal Warning Signs.'),
(6,'[6] MedlinePlus. Preterm labor. 2026.'),
(7,'[7] PhilHealth Circular PC-2026-0016, Annex A: Characteristics of High Risk.')
on conflict (position) do nothing;
