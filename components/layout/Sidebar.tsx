'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Baby,
  CalendarDays,
  ClipboardCheck,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Map as MapIcon,
  Menu,
  MessageSquare,
  Salad,
  Send,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import Logo from '@/components/ui/Logo';
import LogoutButton from '@/components/layout/LogoutButton';
import NotificationBell, { type NotificationBellItem } from '@/components/layout/NotificationBell';

export type MenuItem = { label: string; href: string; icon?: string };

/** Every sidebar item renders a lucide icon — never an emoji. */
const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  map: MapIcon,
  records: Baby,
  schedule: CalendarDays,
  checkups: ClipboardCheck,
  sms: Send,
  users: Users,
  reports: BarChart3,
  manageUsers: UserCog,
  indicators: Activity,
  healthTips: HeartPulse,
  nutritionTips: Salad,
  messages: MessageSquare,
  myInfo: FileText,
  myRecords: FileText,
};

const ROLE_LABELS: Record<string, { title: string; subtitle: string }> = {
  admin: { title: 'Admin', subtitle: 'Midwife' },
  bhw_head: { title: 'Manager', subtitle: 'BHW' },
  nurse: { title: 'Nurse', subtitle: '' },
  pregnant_mother: { title: 'Pregnant Women Portal', subtitle: '' },
};

const DESKTOP_QUERY = '(min-width: 1024px)';

export default function Sidebar({
  role,
  menuItems,
  fullName,
  email,
  notifications,
  children,
}: {
  role: string;
  menuItems: MenuItem[];
  fullName?: string | null;
  email?: string | null;
  notifications: NotificationBellItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const asideRef = useRef<HTMLElement | null>(null);
  const burgerRef = useRef<HTMLButtonElement | null>(null);

  /**
   * Drawer state — used below the lg breakpoint. Stored as the pathname the
   * drawer was opened on, so navigating closes it automatically with no
   * effect (the flag below is derived from the current pathname).
   */
  const [openAt, setOpenAt] = useState<string | null>(null);
  const mobileOpen = openAt === pathname;
  /** Icon-rail collapse — used at lg and above. */
  const [collapsed, setCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  // Escape, outside click and focus handling while the drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpenAt(null);
      burgerRef.current?.focus();
    };
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (asideRef.current?.contains(target)) return;
      if (burgerRef.current?.contains(target)) return;
      setOpenAt(null);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    asideRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  function handleToggle() {
    if (isDesktop) setCollapsed((current) => !current);
    else setOpenAt(mobileOpen ? null : pathname);
  }

  const expanded = isDesktop ? !collapsed : mobileOpen;
  const hideLabels = isDesktop && collapsed;

  return (
    <div className="dashboard-shell h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="topbar shrink-0 flex items-center justify-between px-4 py-2.5 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <button
            ref={burgerRef}
            type="button"
            onClick={handleToggle}
            aria-label={expanded ? 'Close navigation' : 'Open navigation'}
            aria-expanded={expanded}
            aria-controls="app-sidebar"
            className="icon-btn topbar-btn shrink-0"
          >
            {expanded ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
          <span className="topbar-brand text-lg truncate">Prenatrack</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <NotificationBell initialNotifications={notifications} />
          <span className="topbar-avatar" aria-hidden="true">
            {(fullName ?? email ?? '?').charAt(0).toUpperCase()}
          </span>
        </div>
      </header>

      <div className="relative flex flex-1 min-h-0">
        {/* Scrim behind the off-canvas drawer (mobile / tablet) */}
        {mobileOpen && !isDesktop && <div className="sidebar-scrim lg:hidden" aria-hidden="true" />}

        {/* Sidebar */}
        <aside
          id="app-sidebar"
          ref={asideRef}
          tabIndex={-1}
          aria-label="Main navigation"
          className={[
            'dashboard-sidebar',
            'flex flex-col shrink-0 outline-none',
            // Off-canvas drawer below the lg breakpoint
            'max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-40 max-lg:w-[min(17rem,85vw)] max-lg:shadow-xl',
            'max-lg:transition-transform max-lg:duration-200 max-lg:ease-out',
            mobileOpen
              ? 'max-lg:translate-x-0 max-lg:visible'
              : 'max-lg:-translate-x-full max-lg:invisible max-lg:pointer-events-none',
            // Collapsible rail at lg and above
            'lg:visible lg:relative lg:transition-[width] lg:duration-200 lg:ease-out',
            hideLabels ? 'lg:w-[76px]' : 'lg:w-64',
          ].join(' ')}
        >
          <div className="flex-1 h-full flex flex-col overflow-y-auto">
            <div className="p-5 border-b border-[var(--border-light)] shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Logo variant="prenatrack" size={36} rounded />
                {!hideLabels && (
                  <div className="min-w-0">
                    <p className="font-semibold text-ink text-sm truncate">
                      {ROLE_LABELS[role]?.title ?? role.replace('_', ' ')}
                    </p>
                    {ROLE_LABELS[role]?.subtitle && (
                      <p className="text-xs text-muted truncate">{ROLE_LABELS[role].subtitle}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {!hideLabels && (
              <p className="sidebar-section-label px-5 pt-4 pb-2 shrink-0">Main menu</p>
            )}

            <nav className="px-3 space-y-1 pb-4" aria-label="Main menu">
              {menuItems.length === 0 && !hideLabels && (
                <p className="text-sm text-muted-2 px-3 py-2">
                  No menu available for this role yet.
                </p>
              )}
              {menuItems.map((item) => {
                const Icon = ICONS[item.icon ?? ''] ?? FileText;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    title={hideLabels ? item.label : undefined}
                    className={`sidebar-link ${active ? 'is-active' : ''}`}
                  >
                    <Icon className="sidebar-icon" size={18} aria-hidden="true" />
                    {!hideLabels && <span className="sidebar-label">{item.label}</span>}
                  </Link>
                );
              })}
            </nav>

            <div className="px-3 pb-4 mt-auto shrink-0">
              <LogoutButton collapsed={hideLabels} />
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="dashboard-main flex-1 min-w-0 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
