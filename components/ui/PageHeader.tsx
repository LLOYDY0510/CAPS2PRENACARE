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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200/60 anim-fade-up">
      <div className="flex items-center gap-3.5 min-w-0">
        {Icon && (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--brand)] via-[var(--brand-dark)] to-teal-700 text-white flex items-center justify-center shrink-0 shadow-md shadow-teal-700/20">
            <Icon size={22} className="stroke-[2.2]" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-800 truncate">
              {title}
            </h2>
            {badge && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-[var(--brand-dark)] border border-teal-100 shrink-0">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
