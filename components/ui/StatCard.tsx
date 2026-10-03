import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export type StatCardVariant = 'brand' | 'danger' | 'success' | 'warning' | 'purple' | 'accent';

const VARIANT_STYLES: Record<
  StatCardVariant,
  {
    cardBg: string;
    iconBg: string;
    iconColor: string;
    valueColor: string;
    circleColor: string;
  }
> = {
  brand: {
    cardBg: 'from-[var(--brand-light)]/80 via-white to-[var(--surface-alt)]',
    iconBg: 'bg-[var(--brand)]',
    iconColor: 'text-white',
    valueColor: 'text-[var(--brand-dark)]',
    circleColor: 'bg-[var(--brand)]/10',
  },
  danger: {
    cardBg: 'from-[var(--danger-bg)] via-white to-[var(--surface-alt)]',
    iconBg: 'bg-[var(--danger)]',
    iconColor: 'text-white',
    valueColor: 'text-[var(--danger)]',
    circleColor: 'bg-[var(--danger)]/10',
  },
  success: {
    cardBg: 'from-[var(--success-bg)] via-white to-[var(--surface-alt)]',
    iconBg: 'bg-[var(--success)]',
    iconColor: 'text-white',
    valueColor: 'text-[var(--success)]',
    circleColor: 'bg-[var(--success)]/10',
  },
  warning: {
    cardBg: 'from-[var(--warning-bg)] via-white to-[var(--surface-alt)]',
    iconBg: 'bg-[#B45309]',
    iconColor: 'text-white',
    valueColor: 'text-[#B45309]',
    circleColor: 'bg-[#B45309]/10',
  },
  purple: {
    cardBg: 'from-purple-50 via-white to-[var(--surface-alt)]',
    iconBg: 'bg-purple-600',
    iconColor: 'text-white',
    valueColor: 'text-purple-700',
    circleColor: 'bg-purple-500/10',
  },
  accent: {
    cardBg: 'from-[var(--accent-light)] via-white to-[var(--surface-alt)]',
    iconBg: 'bg-[var(--accent)]',
    iconColor: 'text-white',
    valueColor: 'text-[var(--accent-dark)]',
    circleColor: 'bg-[var(--accent)]/10',
  },
};

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
  const styles = VARIANT_STYLES[variant];

  const content = (
    <div className={`relative overflow-hidden rounded-[16px] bg-gradient-to-br ${styles.cardBg} border border-[var(--border-light)] p-5 shadow-card hover:shadow-md transition-all duration-200 group h-full flex flex-col justify-between`}>
      {/* Background Decorative Translucent Circles */}
      <div 
        aria-hidden="true" 
        className={`absolute -top-6 -right-6 w-24 h-24 rounded-full ${styles.circleColor} pointer-events-none transition-transform duration-300 group-hover:scale-125`}
      />
      <div 
        aria-hidden="true" 
        className={`absolute -bottom-8 -left-8 w-28 h-28 rounded-full ${styles.circleColor} pointer-events-none transition-transform duration-300 group-hover:scale-110`}
      />

      {/* Top Row: Title & Icon */}
      <div className="relative z-10 flex items-start justify-between gap-3 mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          {title}
        </p>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl ${styles.iconBg} ${styles.iconColor} flex items-center justify-center shrink-0 shadow-xs`}>
            <Icon size={18} />
          </div>
        )}
      </div>

      {/* Main Value & Trend */}
      <div className="relative z-10 my-1">
        <div className={`text-3xl font-extrabold tracking-tight ${styles.valueColor}`}>
          {value}
        </div>
        {trend && (
          <p className="text-xs font-medium text-[var(--muted)] mt-1 flex items-center gap-1">
            <span className="text-[var(--brand-dark)] font-semibold">{trend}</span>
          </p>
        )}
      </div>

      {/* Footer link hint if interactive */}
      {href && (
        <div className="relative z-10 pt-3 mt-2 border-t border-[var(--border-light)] flex items-center justify-between text-xs font-medium text-[var(--muted)] group-hover:text-[var(--brand-dark)] transition-colors">
          <span>{footerText}</span>
          <ArrowUpRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      )}
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full focus:outline-none focus:ring-2 focus:ring-[var(--brand)] rounded-[16px]">
      {content}
    </Link>
  ) : (
    content
  );
}
