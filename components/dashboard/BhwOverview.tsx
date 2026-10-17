import { listRegistry } from '@/utils/dashboard/registry';
import { registrySummary, riskSummary } from '@/utils/dashboard/summary';
import StatCard from '@/components/ui/StatCard';
import PageHeader from '@/components/ui/PageHeader';

function Bars({items}: {items:[string,number][]}) {
  const maximum=Math.max(1,...items.map(([,count])=>count));
  return <div className="space-y-4 mt-6" role="list">{items.map(([label,count])=><div key={label} role="listitem"><div className="flex justify-between text-sm"><span>{label}</span><span>{count}</span></div><div className="bg-neutral-100 mt-2 h-5"><div className="h-5 bg-green-800" style={{width:`${count/maximum*100}%`}}/></div></div>)}{!items.length&&<p>No registrations yet.</p>}</div>;
}
export default async function BhwOverview() {
  const records=await listRegistry(); const counts=riskSummary(records); const summary=registrySummary(records);
  const values=[counts.highRisk,counts.lowRisk,counts.unassessed]; const colors=['#14532d','#86efac','#111111']; let position=0;
  const stops=values.map((value,index)=>{const start=position;position+=value/Math.max(1,counts.total)*100;return `${colors[index]} ${start}% ${position}%`;});
  return <div className="space-y-6"><PageHeader title="Dashboard" subtitle="Maternal care in your assigned service area"/>
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{[['Registered Patients',counts.total],['High Risk Cases',counts.highRisk],['Low Risk Cases',counts.lowRisk],['Unassessed',counts.unassessed]].map(([title,value])=><StatCard key={title} title={String(title)} value={value}/>)}</div>
    <div className="grid lg:grid-cols-2 gap-6"><section className="card p-6 min-h-80"><h2>Registered per zone</h2><Bars items={summary.purokEntries}/></section>
      <section className="card p-6 min-h-80"><h2>Risk breakdown</h2><div className="flex items-center gap-8 mt-6"><div aria-hidden="true" className="w-40 h-40 rounded-full shrink-0" style={{background:counts.total?`conic-gradient(${stops.join(',')})`:'#eee'}}/><dl className="space-y-3">{['High Risk','Low Risk','Unassessed'].map((label,index)=><div key={label}><dt>{label}</dt><dd className="font-bold">{values[index]}</dd></div>)}</dl></div></section>
      <section className="card p-6 min-h-80"><h2>Registered by age group</h2><Bars items={Object.entries(summary.byAgeGroup)}/></section>
      <section className="card p-6 min-h-80"><h2>Recent registration</h2><table className="data-table mt-4"><thead><tr><th>Name</th><th>Age</th><th>Date Registered</th></tr></thead><tbody>{[...records].sort((a,b)=>(b.date_registered??'').localeCompare(a.date_registered??'')).slice(0,10).map(row=><tr key={row.id}><td>{row.full_name}</td><td>{row.age??'—'}</td><td>{row.date_registered??'—'}</td></tr>)}</tbody></table>{!records.length&&<p className="py-6">No registrations yet.</p>}</section>
    </div></div>;
}
