import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import PrenatalCheckups from '@/components/pregnant/PrenatalCheckups';
import MaternalCarePanel from '@/components/pregnant/MaternalCarePanel';
import InfoRow from '@/components/ui/InfoRow';
import PageHeader from '@/components/ui/PageHeader';
import RiskBadge from '@/components/ui/RiskBadge';
import Button from '@/components/ui/Button';
import { EDIT_ROLES } from '@/utils/auth/roles';
import type { UserRole } from '@/types';
import { User, ClipboardList, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ViewPregnantMotherPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const { view } = await searchParams;
  const showCheckups = view === 'checkups';
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single();

  const role = profile?.role ?? 'pending';
  const canEdit = EDIT_ROLES.includes(role as UserRole);

  const { data: record } = await supabase
    .from('pregnant_mothers')
    .select('*')
    .eq('id', id)
    .single();

  if (!record) {
    notFound();
  }

  const fullName = [record.first_name, record.middle_name, record.last_name]
    .filter(Boolean)
    .join(' ');

  const { data: checkups } = showCheckups
    ? await supabase
        .from('prenatal_checkups')
        .select('id, trimester, checkup_date, scheduled_checkup_date, actual_checkup_date, blood_pressure, weight_kg, notes, status, scheduled_for')
        .eq('pregnant_mother_id', id)
    : { data: [] };

  const { data: scheduleRows } = showCheckups
    ? await supabase
        .from('prenatal_schedules')
        .select('trimester, visit_date, created_at, prenatal_schedule_recipients!inner(pregnant_mother_id)')
        .eq('prenatal_schedule_recipients.pregnant_mother_id', id)
        .not('trimester', 'is', null)
        .order('created_at', { ascending: false })
    : { data: [] };

  const scheduledDates: Record<'1st' | '2nd' | '3rd', string | null> = { '1st': null, '2nd': null, '3rd': null };
  (scheduleRows ?? []).forEach((schedule) => {
    const trimester = schedule.trimester as '1st' | '2nd' | '3rd';
    if ((trimester === '1st' || trimester === '2nd' || trimester === '3rd') && !scheduledDates[trimester]) {
      scheduledDates[trimester] = schedule.visit_date;
    }
  });

  const [{ data: history }, { data: referrals }] = showCheckups
    ? await Promise.all([
        supabase.from('maternal_health_history').select('id, condition, details, diagnosed_date, resolved_date, created_at').eq('pregnant_mother_id', id).order('created_at', { ascending: false }),
        supabase.from('maternal_referrals').select('id, referred_to, reason, status, referred_at, follow_up_date, outcome, updated_at').eq('pregnant_mother_id', id).order('updated_at', { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];

  return (
    <div className="max-w-4xl mx-auto space-y-6 anim-fade-up">
      <div className="flex items-center justify-between gap-4">
        <Link href="/dashboard/pregnant">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft size={16} />}>
            Back to Records
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/pregnant/${id}?view=details`}>
            <Button variant={!showCheckups ? 'primary' : 'outline'} size="sm">
              Mother Details
            </Button>
          </Link>
          <Link href={`/dashboard/pregnant/${id}?view=checkups`}>
            <Button variant={showCheckups ? 'primary' : 'outline'} size="sm" leftIcon={<ClipboardList size={16} />}>
              Prenatal Checkups
            </Button>
          </Link>
        </div>
      </div>

      <PageHeader
        title={`${fullName}`}
        subtitle={`Record Serial: ${record.serial_no ?? '—'}`}
        icon={User}
        badge={record.purok ? `Zone ${record.purok}` : 'Registered'}
      />

      {showCheckups ? (
        <div className="space-y-6">
          <PrenatalCheckups motherId={id} initialCheckups={checkups ?? []} scheduledDates={scheduledDates} canEdit={canEdit} />
          <MaternalCarePanel
            motherId={id}
            canEdit={canEdit}
            initialHistory={history ?? []}
            initialReferrals={referrals ?? []}
          />
        </div>
      ) : (
        <div className="bg-white rounded-[28px] border border-slate-100 shadow-xl shadow-slate-200/50 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Maternal Profile &amp; Vitals</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Demographics and recorded clinical indicators</p>
            </div>
            <RiskBadge riskLevel={record.risk_level} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-xs sm:text-sm">
            <InfoRow label="Date Registered" value={record.date_registered} />
            <InfoRow label="Address" value={record.address} />
            <InfoRow label="Zone / Purok" value={record.purok ? `Zone ${record.purok}` : null} />
            <InfoRow label="Age" value={record.age ? `${record.age} years old` : null} />
            <InfoRow label="Contact Number" value={record.contact_number} />
            <InfoRow label="LMP (Last Menstrual Period)" value={record.lmp} />
            <InfoRow label="EDC (Expected Date)" value={record.edd} />
            <InfoRow label="Gravida-Para" value={record.gravida_para} />
            <InfoRow label="Blood Pressure" value={record.blood_pressure} />
            <InfoRow label="Height" value={record.height_cm ? `${record.height_cm} cm` : null} />
            <InfoRow label="Weight" value={record.weight_kg ? `${record.weight_kg} kg` : null} />
            <InfoRow label="Risk Assessment" value={record.risk_level === 'high' ? 'High Risk' : 'Low Risk'} />
          </div>
        </div>
      )}
    </div>
  );
}
