import type { ReactNode } from 'react';

export default function PageHeader({ title, subtitle, actions }: {
  title: string; subtitle?: string; icon?: React.ComponentType<{ className?: string; size?: number }>; badge?: string; actions?: ReactNode;
}) {
  return <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
    <div><h1 className="text-2xl font-bold">{title}</h1>{subtitle && <p className="text-sm text-neutral-600 mt-2">{subtitle}</p>}</div>
    {actions && <div className="flex gap-2">{actions}</div>}
  </header>;
}
