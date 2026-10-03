import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export type StatCardVariant = 'brand' | 'danger' | 'success' | 'warning' | 'purple' | 'accent';

const VARIANT_ACCENTS: Record<
  StatCardVariant,
  {
    iconBg: string;
    iconColor: string;
    valueColor: string;
    barColor: string;
    badgeBg: string;
  }
> = {
  brand: {
    iconBg: 'bg-teal-50 text-[var(--brand)]',
    iconColor: 'text-[var(--brand)]',
    valueColor: 'text-slate-900',
    barColor: 'bg-[var(--brand)]',
    badgeBg: 'bg-teal-50 text-[var(--brand-dark)]',
  },
  danger: {
    iconBg: 'bg-rose-50 text-rose-600',
    iconColor: 'text-rose-600',
    valueColor: 'text-slate-900',
    barColor: 'bg-rose-500',
    badgeBg: 'bg-rose-50 text-rose-700',
  },
  success: {
    iconBg: 'bg-emerald-50 text-emerald-600',
    iconColor: 'text-emerald-600',
    valueColor: 'text-slate-900',
    barColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-50 text-emerald-700',
  },
  warning: {
    iconBg: 'bg-amber-50 text-amber-600',
    iconColor: 'text-amber-600',
    valueColor: 'text-slate-900',
    barColor: 'bg-amber-500',
    badgeBg: 'bg-amber-50 text-amber-700',
  },
  purple: {
    iconBg: 'bg-purple-50 text-purple-600',
    iconColor: 'text-purple-600',
    valueColor: 'text-slate-900',
    barColor: 'bg-purple-500',
    badgeBg: 'bg-purple-50 text-purple-700',
  },
  accent: {
    iconBg: 'bg-indigo-50 text-indigo-600',
    iconColor: 'text-indigo-600',
    valueColor: 'text-slate-900',
    barColor: 'bg-indigo-500',
    badgeBg: 'bg-indigo-50 text-indigo-700',
  },
};

// Default static heights for mini bar charts
const MINI_BAR_HEIGHTS = ['40%', '65%', '45%', '90%', '70%', '100%', '60%'];

export default function StatCard({
  title,
  value,
  trend,
  icon: Icon,
  variant = 'brand',
  href,
  footerText = 'View details',
}: {
  title: string;
  value: number | string;
  trend?: string;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
  variant?: StatCardVariant;
  href?: string;
  footerText?: string;
}) {
  const styles = VARIANT_ACCENTS[variant];

  const content = (
    <div className="card rounded-[24px] bg-white p-5 sm:p-6 shadow-card hover:shadow-bubbly border border-slate-100 hover:-translate-y-1 transition-all duration-200 group h-full flex flex-col justify-between relative overflow-hidden">
      {/* Top Row: Title & Icon */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {title}
        </p>
        {Icon && (
          <div className={`w-10 h-10 rounded-2xl ${styles.iconBg} flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 transition-transform`}>
            <Icon size={20} className="stroke-[2.2]" />
          </div>
        )}
      </div>

      {/* Main Value & Sub-label */}
      <div className="my-1">
        <div className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${styles.valueColor}`}>
          {value}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          {trend && (
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${styles.badgeBg}`}>
              {trend}
            </span>
          )}
          <span className="text-[11px] font-semibold text-slate-400">on this week</span>
        </div>
      </div>

      {/* Rounded-top Mini Bar Charts */}
      <div className="flex items-end justify-between gap-1.5 h-9 mt-4 pt-2 border-t border-slate-100">
        {MINI_BAR_HEIGHTS.map((height, i) => (
          <div
            key={i}
            className="flex-1 bg-slate-100 rounded-t-full overflow-hidden flex items-end"
            style={{ height: '100%' }}
          >
            <div
              className={`w-full ${styles.barColor} rounded-t-full transition-all duration-300 opacity-80 group-hover:opacity-100`}
              style={{ height }}
            />
          </div>
        ))}
      </div>

      {/* Footer link hint if interactive */}
      {href && (
        <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500 group-hover:text-[var(--brand)] transition-colors">
          <span>{footerText}</span>
          <ArrowUpRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      )}
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full focus:outline-none focus:ring-2 focus:ring-[var(--brand)] rounded-[24px]">
      {content}
    </Link>
  ) : (
    content
  );
}
