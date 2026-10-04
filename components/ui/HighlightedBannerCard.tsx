import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function HighlightedBannerCard({
  title = 'Maternal Health Reminder',
  description = 'Keep track of regular prenatal checkups and nutritional recommendations for optimal maternal care.',
  buttonText = 'Learn more',
  href = '/dashboard/health-tips',
  badgeText = 'Featured Notice',
  icon: Icon = Sparkles,
}: {
  title?: string;
  description?: string;
  buttonText?: string;
  href?: string;
  badgeText?: string;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
}) {
  return (
    <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-amber-100/90 via-orange-50/80 to-teal-50/90 border border-amber-200/60 p-6 shadow-sm hover:shadow-md transition-all duration-200 group">
      {/* Decorative background circle */}
      <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-amber-200/30 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-200/60 border border-amber-300/60 text-amber-900 text-[11px] font-extrabold uppercase tracking-wider">
            <Icon size={14} className="text-amber-700" />
            <span>{badgeText}</span>
          </div>

          <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            {title}
          </h3>

          <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
            {description}
          </p>
        </div>

        <div className="shrink-0">
          <Link
            href={href}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs shadow-md hover:scale-105 transition-all group-hover:bg-[var(--brand)]"
          >
            <span>{buttonText}</span>
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <ArrowRight size={14} className="stroke-[2.5]" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
