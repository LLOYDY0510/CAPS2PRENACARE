import Link from 'next/link';
import { requireRoles } from '@/utils/auth/roles';
import PageHeader from '@/components/ui/PageHeader';
export default async function ScheduleHistoryPage({params}: {params:Promise<{id:string}>}) {
  const {supabase}=await requireRoles(['bhw','nurse']); const {id}=await params;
  const {data,error}=await supabase.from('schedule_events').select('id,patient_name,visit_date,notes,status,action,occurred_at').eq('schedule_id',id).order('occurred_at',{ascending:false});
  return <section className="card p-6"><PageHeader title="Schedule history"/><Link href="/dashboard/schedule">Back to schedules</Link>{error&&<p role="alert">Could not load history.</p>}<table className="data-table mt-4"><thead><tr><th>Name</th><th>Date of Visit</th><th>Notes</th><th>Status</th><th>Event</th><th>Timestamp</th></tr></thead><tbody>{data?.map(row=><tr key={row.id}><td>{row.patient_name}</td><td>{row.visit_date}</td><td>{row.notes}</td><td>{row.status}</td><td>{row.action}</td><td>{row.occurred_at}</td></tr>)}</tbody></table></section>;
}
