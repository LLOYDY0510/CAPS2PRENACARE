-- Indicator-specific monthly advice (high risk) transcribed from docs/Message/advisesandhealthtip.pdf.
-- Served ONLY through the server-side auto-send engine; browser roles have no access.
create table if not exists public.indicator_monthly_advice (
  id uuid primary key default gen_random_uuid(),
  indicator_label text not null,
  month integer not null check (month >= 1 and month <= 9),
  content text not null,
  constraint indicator_monthly_advice_unique unique (indicator_label, month)
);
alter table public.indicator_monthly_advice enable row level security;
revoke all on public.indicator_monthly_advice from public,anon,authenticated;
grant select,insert,update,delete on public.indicator_monthly_advice to service_role;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Maternal age below 19 years old at delivery',1,'Magpa-check up dayon sa health center/ob-gyn; kuhaa ang complete prenatal history ug blood tests.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Maternal age below 19 years old at delivery',2,'Mag-start og folic acid ug iron supplements kung iprescribe sa health provider.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Maternal age below 19 years old at delivery',3,'Magpamonitor sa blood pressure, weight, ug nutritional status.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Maternal age below 19 years old at delivery',4,'Mag-focus sa balanced diet, enough rest, ug paglikay sa smoking/alcohol.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Maternal age below 19 years old at delivery',5,'Magpascreening para sa anemia, infections, ug uban pang pregnancy complications.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Maternal age below 19 years old at delivery',6,'Mag-monitor sa fetal movement ug mag-report og unusual symptoms.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Maternal age below 19 years old at delivery',7,'Mag-attend sa prenatal classes; mag-andam na sa birth plan ug emergency contact.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Maternal age below 19 years old at delivery',8,'Mag-monitor og mas kanunay tungod sa mas taas nga risk for preterm birth ug low birth weight.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Maternal age below 19 years old at delivery',9,'Magpa-check up kada semana; andama ang hospital bag, transport, ug emergency contact. Mag-report dayon og labor signs.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('First pregnancy at age 35 years and older',1,'Magpa-early prenatal check-up ug genetic counseling kung available.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('First pregnancy at age 35 years and older',2,'Magpa-first-trimester screening para sa chromosomal abnormalities kung recommended.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('First pregnancy at age 35 years and older',3,'Magpaultrasound ug blood tests base sa obstetrician’s advice.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('First pregnancy at age 35 years and older',4,'Mag-monitor sa blood pressure ug blood sugar.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('First pregnancy at age 35 years and older',5,'Magpascreening for gestational diabetes sa 24–28 weeks.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('First pregnancy at age 35 years and older',6,'Mag-monitor sa baby’s growth ug fetal movement.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('First pregnancy at age 35 years and older',7,'Mag-andam sa delivery plan; discuss possible cesarean section or other delivery risks.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('First pregnancy at age 35 years and older',8,'Mag-increase prenatal visits kung kinahanglan; monitor blood pressure ug swelling.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('First pregnancy at age 35 years and older',9,'Magpa-check up kada semana; discuss sa doctor ang timing sa delivery; mag-report og labor signs.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Multiple or multifetal pregnancy (twins, triplets)',1,'Magpa-early ultrasound para makumpirma ang number ug location sa mga babies.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Multiple or multifetal pregnancy (twins, triplets)',2,'Magpa-more frequent prenatal visits ug follow specialist/ob-gyn advice.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Multiple or multifetal pregnancy (twins, triplets)',3,'Mag-take iron, folic acid, ug calcium supplements kung iprescribe.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Multiple or multifetal pregnancy (twins, triplets)',4,'Magpa-monitor sa cervical length ug signs of preterm labor.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Multiple or multifetal pregnancy (twins, triplets)',5,'Magpa-more frequent fetal growth ultrasounds.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Multiple or multifetal pregnancy (twins, triplets)',6,'Mag-monitor sa fetal movement ug report any decrease in movement.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Multiple or multifetal pregnancy (twins, triplets)',7,'Mag-andam sa hospital delivery plan; discuss neonatal intensive care needs.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Multiple or multifetal pregnancy (twins, triplets)',8,'Mag-monitor closely for preterm labor, bleeding, ug high blood pressure.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Multiple or multifetal pregnancy (twins, triplets)',9,'Weekly monitoring; mag-deliver sa hospital nga naa’y NICU; mag-report dayon og contractions o pagbuak sa tubig.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Ovarian abnormality (e.g., ovarian cyst)',1,'Magpaultrasound para ma-evaluate ang size ug type sa cyst.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Ovarian abnormality (e.g., ovarian cyst)',2,'Mag-follow-up sa ob-gyn; report sudden severe abdominal pain, vomiting, or fever.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Ovarian abnormality (e.g., ovarian cyst)',3,'Magparepeat ultrasound kung i-recommend sa doctor.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Ovarian abnormality (e.g., ovarian cyst)',4,'Mag-monitor for ovarian torsion symptoms: sudden one-sided pain, nausea, vomiting.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Ovarian abnormality (e.g., ovarian cyst)',5,'Magpa-follow-up ultrasound kung kinahanglan.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Ovarian abnormality (e.g., ovarian cyst)',6,'Avoid self-treating; follow doctor’s advice on activity restrictions.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Ovarian abnormality (e.g., ovarian cyst)',7,'Magpamonitor kung ang cyst nagdako o nag-change.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Ovarian abnormality (e.g., ovarian cyst)',8,'Discuss delivery plan kung ang cyst dako o adunay risk for complications.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Ovarian abnormality (e.g., ovarian cyst)',9,'Final check sa ob-gyn; sundon ang napagkasabutang delivery plan; mag-report og sudden severe abdominal pain.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Uterine abnormality (e.g., myoma uteri)',1,'Magpa-early ultrasound para malocate ang myoma ug i-assess ang epekto sa pregnancy.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Uterine abnormality (e.g., myoma uteri)',2,'Mag-report heavy bleeding, severe pain, or fever dayon.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Uterine abnormality (e.g., myoma uteri)',3,'Magpamonitor sa myoma size ug position through ultrasound.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Uterine abnormality (e.g., myoma uteri)',4,'Magpa-monitor for pain, bleeding, o preterm contractions.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Uterine abnormality (e.g., myoma uteri)',5,'Magpa-follow-up ultrasound kung kinahanglan.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Uterine abnormality (e.g., myoma uteri)',6,'Mag-monitor sa baby’s growth ug position.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Uterine abnormality (e.g., myoma uteri)',7,'Discuss delivery route kung ang myoma naa sa lower uterus o near cervix.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Uterine abnormality (e.g., myoma uteri)',8,'Mag-monitor for preterm labor ug bleeding.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Uterine abnormality (e.g., myoma uteri)',9,'I-confirm ang delivery route (vaginal o cesarean); mag-report og bleeding o regular contractions dayon.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Placental abnormality (e.g., placenta previa)',1,'Magpa-early ultrasound; avoid vaginal examination kung suspected placenta previa.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Placental abnormality (e.g., placenta previa)',2,'Mag-report any vaginal bleeding dayon, bisan spotting lang.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Placental abnormality (e.g., placenta previa)',3,'Magparepeat ultrasound para macheck ang placenta position.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Placental abnormality (e.g., placenta previa)',4,'Avoid sexual intercourse, vaginal exams, ug strenuous activity kung i-advise sa doctor.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Placental abnormality (e.g., placenta previa)',5,'Magpamonitor for painless vaginal bleeding.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Placental abnormality (e.g., placenta previa)',6,'Magparepeat ultrasound sa 32– 36 weeks para ma-confirm ang placenta position.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Placental abnormality (e.g., placenta previa)',7,'Mag-andam sa cesarean delivery plan kung ang placenta previa persisting.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Placental abnormality (e.g., placenta previa)',8,'Avoid vaginal delivery kung confirmed placenta previa; follow obstetrician’s advice.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Placental abnormality (e.g., placenta previa)',9,'Scheduled cesarean delivery sa hospital base sa obstetrician; adto dayon sa hospital kung adunay bleeding.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Abnormal fetal presentation (e.g., breech)',1,'Regular prenatal check-up.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Abnormal fetal presentation (e.g., breech)',2,'Regular prenatal check-up ug ultrasound kung kinahanglan.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Abnormal fetal presentation (e.g., breech)',3,'Magpamonitor sa fetal position.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Abnormal fetal presentation (e.g., breech)',4,'Magpaultrasound kung kinahanglan para ma-check ang presentation.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Abnormal fetal presentation (e.g., breech)',5,'Magpamonitor fetal movement ug growth.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Abnormal fetal presentation (e.g., breech)',6,'Magpacheck ang fetal position sa 28–32 weeks.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Abnormal fetal presentation (e.g., breech)',7,'Magpaassess kung ang baby still breech; discuss external cephalic version kung eligible.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Abnormal fetal presentation (e.g., breech)',8,'Mag-plan for vaginal delivery or cesarean base sa doctor’s assessment.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Abnormal fetal presentation (e.g., breech)',9,'I-confirm ang fetal position; sundon ang delivery plan; adto dayon sa hospital kung mag-labor o mabuak ang tubig.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of 3 or more miscarriages/abortions',1,'Magpa-early prenatal check-up ug complete pregnancy history.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of 3 or more miscarriages/abortions',2,'Magpa-blood tests kung i-recommend, including thyroid, diabetes, ug clotting disorders.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of 3 or more miscarriages/abortions',3,'Magpaultrasound para ma-confirm ang fetal heartbeat ug growth.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of 3 or more miscarriages/abortions',4,'Magpa-monitor for bleeding, cramping, or cervical changes.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of 3 or more miscarriages/abortions',5,'Magpacervical length assessment kung history of cervical insufficiency.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of 3 or more miscarriages/abortions',6,'Magpamonitor for signs of preterm labor.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of 3 or more miscarriages/abortions',7,'Magpacervical length monitoring kung kinahanglan.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of 3 or more miscarriages/abortions',8,'Magpa-more frequent visits; report any spotting or contractions dayon.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of 3 or more miscarriages/abortions',9,'Weekly check-up; mag-report dayon og contractions, spotting, o fluid leakage; andama ang delivery plan.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of 1 stillbirth',1,'Magpa-early prenatal check-up ug review sa previous pregnancy records.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of 1 stillbirth',2,'Magpa-tests para M sa possible causes ult kung i-m recommend: diabetes, hypertension, infections, clotting disorders.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of 1 stillbirth',3,'agpa-early rasound ug fetal onitoring.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of 1 stillbirth',4,'Magpa-monitor sa fetal movement ug growth.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of 1 stillbirth',5,'Magpadoppler ultrasound kung i-recommend sa doctor.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of 1 stillbirth',6,'Magpaincrease fetal movement monitoring.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of 1 stillbirth',7,'Magpa-non-stress test o biophysical profile kung i-recommend.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of 1 stillbirth',8,'Magpa-more frequent fetal monitoring.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of 1 stillbirth',9,'Weekly fetal monitoring; discuss sa doctor ang timing sa delivery; mag-report dayon og decreased fetal movement.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of major obstetric/gynecologic operation (e.g., cesarean section, myomectomy)',1,'Magpareview sa previous surgical records ug scar type.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of major obstetric/gynecologic operation (e.g., cesarean section, myomectomy)',2,'Magpa-early ultrasound para ma-check ang placenta location.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of major obstetric/gynecologic operation (e.g., cesarean section, myomectomy)',3,'Magpamonitor for scar pain or abnormal bleeding.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of major obstetric/gynecologic operation (e.g., cesarean section, myomectomy)',4,'Magpa-screen for placenta accreta spectrum kung prior cesarean ug placenta previa.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of major obstetric/gynecologic operation (e.g., cesarean section, myomectomy)',5,'Magpaultrasound kung kinahanglan para sa placenta location.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of major obstetric/gynecologic operation (e.g., cesarean section, myomectomy)',6,'Magpamonitor sa uterine scar ug fetal growth.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of major obstetric/gynecologic operation (e.g., cesarean section, myomectomy)',7,'Mag-plan delivery route: vaginal birth after cesarean (VBAC) or repeat cesarean base sa doctor’s advice.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of major obstetric/gynecologic operation (e.g., cesarean section, myomectomy)',8,'Mag-report any scar pain, bleeding, or contractions dayon.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of major obstetric/gynecologic operation (e.g., cesarean section, myomectomy)',9,'Final confirm sa delivery route (VBAC o repeat cesarean); mag-report dayon og scar pain, bleeding, o contractions.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of medical conditions (hypertension, preeclampsia, eclampsia, heart disease, diabetes, thyroid disorder, morbid obesity, moderate to severe asthma, epilepsy, renal disease, bleeding disorder)',1,'Magpa-early prenatal check-up ug coordinate sa specialist kung kinahanglan.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of medical conditions (hypertension, preeclampsia, eclampsia, heart disease, diabetes, thyroid disorder, morbid obesity, moderate to severe asthma, epilepsy, renal disease, bleeding disorder)',2,'Magpa-blood pressure, blood sugar, kidney, ug thyroid monitoring base sa condition.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of medical conditions (hypertension, preeclampsia, eclampsia, heart disease, diabetes, thyroid disorder, morbid obesity, moderate to severe asthma, epilepsy, renal disease, bleeding disorder)',3,'Magpaadjust medications only under doctor’s advice.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of medical conditions (hypertension, preeclampsia, eclampsia, heart disease, diabetes, thyroid disorder, morbid obesity, moderate to severe asthma, epilepsy, renal disease, bleeding disorder)',4,'Magpa-monitor for swelling, headache, visual changes, or shortness of breath.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of medical conditions (hypertension, preeclampsia, eclampsia, heart disease, diabetes, thyroid disorder, morbid obesity, moderate to severe asthma, epilepsy, renal disease, bleeding disorder)',5,'Magpascreening for gestational diabetes sa 24–28 weeks.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of medical conditions (hypertension, preeclampsia, eclampsia, heart disease, diabetes, thyroid disorder, morbid obesity, moderate to severe asthma, epilepsy, renal disease, bleeding disorder)',6,'Magpamonitor sa blood pressure ug fetal growth.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of medical conditions (hypertension, preeclampsia, eclampsia, heart disease, diabetes, thyroid disorder, morbid obesity, moderate to severe asthma, epilepsy, renal disease, bleeding disorder)',7,'Magpaincrease visits kung high-risk; monitor for preeclampsia symptoms.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of medical conditions (hypertension, preeclampsia, eclampsia, heart disease, diabetes, thyroid disorder, morbid obesity, moderate to severe asthma, epilepsy, renal disease, bleeding disorder)',8,'Magpa-more frequent monitoring; report severe headache, vision changes, chest pain, or decreased fetal movement.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('History of medical conditions (hypertension, preeclampsia, eclampsia, heart disease, diabetes, thyroid disorder, morbid obesity, moderate to severe asthma, epilepsy, renal disease, bleeding disorder)',9,'Weekly monitoring sa BP, blood sugar, ug fetal well-being; discuss timing ug lugar sa delivery; report dayon ang severe headache, vision changes, o chest pain.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Other risk factors during present pregnancy (e.g., premature contractions, vaginal bleeding)',1,'Mag-report any bleeding, severe pain, or fluid leakage dayon.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Other risk factors during present pregnancy (e.g., premature contractions, vaginal bleeding)',2,'Magpa-check up dayon kung adunay bleeding o cramping.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Other risk factors during present pregnancy (e.g., premature contractions, vaginal bleeding)',3,'Mag-report regular contractions, watery discharge, or pelvic pressure.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Other risk factors during present pregnancy (e.g., premature contractions, vaginal bleeding)',4,'Magpa-monitor for signs of preterm labor.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Other risk factors during present pregnancy (e.g., premature contractions, vaginal bleeding)',5,'Mag-report vaginal bleeding, fluid leakage, o decreased fetal movement.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Other risk factors during present pregnancy (e.g., premature contractions, vaginal bleeding)',6,'Magpamonitor contractions; go to hospital kung regular o painful.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Other risk factors during present pregnancy (e.g., premature contractions, vaginal bleeding)',7,'Mag-report any bleeding, fluid leakage, o regular contractions.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Other risk factors during present pregnancy (e.g., premature contractions, vaginal bleeding)',8,'Go to hospital dayon kung adunay bright red bleeding, fluid leakage, o regular contractions before 37 weeks.')
on conflict (indicator_label,month) do update set content=excluded.content;
insert into public.indicator_monthly_advice(indicator_label,month,content) values('Other risk factors during present pregnancy (e.g., premature contractions, vaginal bleeding)',9,'Adto dayon sa hospital kung regular contractions, bleeding, fluid leakage, o decreased fetal movement; andama ang hospital bag.')
on conflict (indicator_label,month) do update set content=excluded.content;
