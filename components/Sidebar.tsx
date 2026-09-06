'use client';
 
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';
 
type MenuItem = { label: string; href: string };
 
const ROLE_LABELS: Record<string, { title: string; subtitle: string }> = {
  admin: { title: 'Admin', subtitle: 'Midwife' },
  bhw_head: { title: 'Manager', subtitle: 'BHW' },
};

const ICONS: Record<string, string> = {
  Dashboard: '',
  'Risk Map': '',
  'Pregnant Records': '',
  'Prenatal Schedule': '',
  'Prenatal Checkups': '',
  'SMS Log': '',
  'Manage BHW (Purok)': '',
  'Manage Users': '',
  Reports: '',
};
 
export default function Sidebar({
  role,
  menuItems,
  fullName,
  email,
  children,
}: {
  role: string;
  menuItems: MenuItem[];
  fullName?: string | null;
  email?: string | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();
 
  return (
    <div className="h-screen flex flex-col bg-[#F3F4F6] overflow-hidden">
      {/* Top bar */}
      <header className="shrink-0 bg-[#0E3D38] text-white flex items-center justify-between px-4 py-3 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            className="p-2 rounded-lg hover:bg-white/10 transition"
          >
            <div className="w-5 h-0.5 bg-white mb-1"></div>
            <div className="w-5 h-0.5 bg-white mb-1"></div>
            <div className="w-5 h-0.5 bg-white"></div>
          </button>
          <span className="font-display text-lg font-semibold">Prenatrack</span>
        </div>
 
                <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-sm font-semibold">
            {(fullName ?? email ?? '?').charAt(0).toUpperCase()}
          </div>
        </div>
      </header>
 
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside
          className={`
            bg-white border-r border-gray-100 flex flex-col shrink-0 overflow-hidden
            transition-all duration-200
            ${open ? 'w-64' : 'w-0'}
          `}
        >
          <div className="w-64 h-full flex flex-col overflow-y-auto">
            <div className="p-5 border-b border-gray-100 shrink-0">
                            <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full overflow-hidden relative shrink-0">
                  <Image src="/logo.jpg" alt="Prenatrack logo" fill className="object-cover" />
                </div>
                <div>
                  <p className="font-semibold text-ink text-sm">
                    {ROLE_LABELS[role]?.title ?? role.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-muted">
                    {ROLE_LABELS[role]?.subtitle ?? ''}
                  </p>
                </div>
              </div>
            </div>
 
            <p className="text-xs font-semibold text-muted-2 tracking-wide px-5 pt-4 pb-1 shrink-0">
              MAIN MENU
            </p>
 
            <nav className="px-3 space-y-1 pb-4">
              {menuItems.length === 0 && (
                <p className="text-sm text-muted-2 px-3 py-2">
                  No menu available for this role yet.
                </p>
              )}
              {menuItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                      active
                        ? 'bg-brand-light text-brand font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>{ICONS[item.label] ?? '•'}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
 
            <div className="px-3 pb-4 mt-auto shrink-0">
              <LogoutButton />
            </div>
          </div>
        </aside>
 
        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}