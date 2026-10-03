import type { ReactNode, ComponentType } from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({
  title = 'No records found',
  description = 'There are no items to display at this time.',
  icon: Icon = Inbox,
  action,
}: {
  title?: string;
  description?: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-[24px] bg-slate-50/70 border border-dashed border-slate-200 my-4 anim-fade-in">
      <div className="w-16 h-16 rounded-full bg-white text-[var(--brand)] flex items-center justify-center mb-4 shadow-sm border border-slate-100">
        <Icon size={28} className="stroke-[2]" />
      </div>
      <h3 className="text-base font-extrabold text-slate-800 tracking-tight">{title}</h3>
      <p className="text-xs sm:text-sm font-medium text-slate-500 max-w-sm mt-1 leading-relaxed">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
