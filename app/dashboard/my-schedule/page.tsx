import { AccountNotLinked } from '@/components/ui/PatientNotices';
import { getPatientContext } from '@/utils/patient';
import PageHeader from '@/components/ui/PageHeader';
export const dynamic='force-dynamic';
export default async function MySchedulePage({searchParams}: {searchParams:Promise<{page?:string}>}) {
  const {supabase,pregnantMotherId}=await getPatientContext(); if(!pregnantMotherId)return <AccountNotLinked/>;
  const page=Math.max(1,Number((await searchParams).page)||1);
  const {data,error}=await supabase.from('prenatal_schedules').select('id,visit_date,trimester,notes,status,prenatal_schedule_recipients!inner(pregnant_mother_id)').eq('prenatal_schedule_recipients.pregnant_mother_id',pregnantMotherId).order('visit_date',{ascending:false}).range((page-1)*25,page*25-1);
  return <section className="card p-6"><PageHeader title="Prenatal Schedule"/>{error&&<p role="alert" className="error-message">Your schedule could not be loaded.</p>}<div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Date of Visit</th><th>Trimester</th><th>Notes</th><th>Status</th></tr></thead><tbody>{data?.map(row=><tr key={row.id}><td>{row.visit_date}</td><td>{row.trimester}</td><td>{row.notes??'—'}</td><td>{row.status}</td></tr>)}{!data?.length&&<tr><td colSpan={4}>No schedules assigned yet.</td></tr>}</tbody></table></div><nav className="flex gap-4 mt-4">{page>1&&<a href={`?page=${page-1}`}>Previous</a>}{data?.length===25&&<a href={`?page=${page+1}`}>Next</a>}</nav></section>;
}
