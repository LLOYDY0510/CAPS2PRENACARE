export type StatCardVariant = 'brand' | 'danger' | 'success' | 'warning' | 'purple' | 'accent';

export default function StatCard({ title, value, trend, icon: Icon }: {
  title: string; value: number | string; trend?: string;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
  variant?: StatCardVariant; href?: string; footerText?: string;
}) {
  return <section className="kpi-card" aria-label={title}>
    <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{title}</p>{Icon && <Icon size={20} aria-hidden="true" />}</div>
    <p className="text-3xl font-bold mt-4">{value}</p>
    {trend && <p className="text-sm mt-2 text-neutral-600">{trend}</p>}
  </section>;
}
