import { requireRoles } from '@/utils/auth/roles';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
type Totals={total_users:number;patients:number;nurses:number;bhws:number;high_risk:number;low_risk:number;delivered:number;activities:{day:string;count:number}[]};
export default async function AdminOverview() {
  const {supabase}=await requireRoles(['admin']);
  const {data,error}=await supabase.rpc('admin_dashboard_summary');
  if(error)return <p role="alert">Dashboard statistics could not be loaded.</p>;
  const totals=data as Totals;const maximum=Math.max(1,...totals.activities.map(day=>day.count));
  const points=totals.activities.map((day,index)=>`${30+index*85},${160-day.count/maximum*130}`).join(' ');
  return <div className="space-y-6"><PageHeader title="Dashboard" subtitle="Account counts include pending and disabled accounts"/>
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{[['Total Users',totals.total_users],['Mothers',totals.patients],['Nurse',totals.nurses],['BHW',totals.bhws]].map(([title,value])=><StatCard key={title} title={String(title)} value={value}/>)}</div>
    <div className="grid lg:grid-cols-2 gap-6"><section className="card p-6"><h2 className="font-bold">System activities · last 7 days</h2><svg viewBox="0 0 570 200" role="img" aria-label="Seven-day activity line chart" className="w-full mt-6"><polyline points={points} fill="none" stroke="#166534" strokeWidth="3"/>{totals.activities.map((day,index)=><g key={day.day}><circle cx={30+index*85} cy={160-day.count/maximum*130} r="4" fill="#166534"/><text x={30+index*85} y="185" textAnchor="middle" fontSize="10">{day.day.slice(5)}</text></g>)}</svg><dl className="grid grid-cols-7 text-xs">{totals.activities.map(day=><div key={day.day}><dt>{day.day.slice(5)}</dt><dd>{day.count}</dd></div>)}</dl></section>
    <section className="card p-6"><h2 className="font-bold mb-6">Status distribution</h2><dl className="space-y-5">{[['High Risk',totals.high_risk],['Low Risk',totals.low_risk],['SMS delivered',totals.delivered]].map(([label,count])=><div className="flex justify-between border-b pb-4" key={label}><dt>{label}</dt><dd className="font-bold">{count}</dd></div>)}</dl></section></div></div>;
}
