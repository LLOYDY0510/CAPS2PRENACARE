import type { ReactNode } from 'react';

export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  badge,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
  badge?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-2 border-b border-[var(--border-light)] anim-fade-up">
      <div className="flex items-center gap-3.5 min-w-0">
        {Icon && (
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[var(--brand)] via-[var(--brand-dark)] to-[var(--accent)] text-white flex items-center justify-center shrink-0 shadow-md">
            <Icon size={22} className="stroke-[2]" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink)] truncate">
              {title}
            </h1>
            {badge && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--brand-light)] text-[var(--brand-dark)] border border-[var(--brand-subtle)] shrink-0">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {actions ?? (
          <span className="text-xs font-medium text-[var(--muted-2)] bg-[var(--surface-alt)] px-3 py-1.5 rounded-lg border border-[var(--border-light)]">
            Overview
          </span>
        )}
      </div>
    </div>
  );
}
