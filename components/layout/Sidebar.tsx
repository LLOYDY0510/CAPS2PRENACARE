'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Baby,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Map as MapIcon,
  Menu,
  MessageSquare,
  Salad,
  Search,
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

const ROLE_LABELS: Record<string, { title: string; subtitle: string; badge: string }> = {
  admin: { title: 'Administrator', subtitle: 'Midwife & Health Staff', badge: 'Admin' },
  bhw_head: { title: 'BHW Manager', subtitle: 'Barangay Care Lead', badge: 'Head' },
  bhw_purok: { title: 'BHW Purok Care', subtitle: 'Barangay Worker', badge: 'Field' },
  nurse: { title: 'Public Health Nurse', subtitle: 'Clinical Staff', badge: 'Nurse' },
  pregnant_mother: { title: 'Pregnant Mother', subtitle: 'Patient Portal', badge: 'Mother' },
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

  const [openAt, setOpenAt] = useState<string | null>(null);
  const mobileOpen = openAt === pathname;
  const [collapsed, setCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

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

  const displayName = fullName || email?.split('@')[0] || 'User';
  const roleInfo = ROLE_LABELS[role] ?? { title: role.replace('_', ' '), subtitle: '', badge: 'Staff' };
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="dashboard-shell h-screen flex flex-col overflow-hidden bg-[var(--background)]">
      {/* Top Bar */}
      <header className="topbar shrink-0 flex items-center justify-between px-4 sm:px-6 h-16 border-b border-[var(--border)] bg-white z-30 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            ref={burgerRef}
            type="button"
            onClick={handleToggle}
            aria-label={expanded ? 'Close navigation' : 'Open navigation'}
            aria-expanded={expanded}
            aria-controls="app-sidebar"
            className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-[var(--surface-alt)] text-[var(--ink-secondary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          >
            {expanded ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
          <div className="flex items-center gap-2 lg:hidden">
            <Logo variant="prenatrack" size={32} priority className="rounded-lg shadow-xs" />
            <span className="font-bold text-base text-[var(--ink)] tracking-tight">Prenatrack</span>
          </div>

          {/* Search Bar Input */}
          <div className="hidden sm:flex items-center relative min-w-[220px] max-w-xs ml-2">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-2)] pointer-events-none" />
            <input
              type="text"
              placeholder="Search records, schedules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs bg-[var(--surface-alt)] hover:bg-[var(--surface-sunken)] focus:bg-white border border-[var(--border-light)] focus:border-[var(--brand)] rounded-xl text-[var(--ink)] placeholder-[var(--placeholder)] transition-all outline-none"
            />
          </div>
        </div>

        {/* Top Right Bar Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <NotificationBell initialNotifications={notifications} />

          <div className="h-6 w-px bg-[var(--border-light)] hidden sm:block" />

          {/* User Profile Dropdown Display */}
          <div className="flex items-center gap-2.5 pl-1">
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] text-white text-xs font-bold flex items-center justify-center shadow-xs">
              {initials}
            </span>
            <div className="hidden sm:block text-left min-w-0">
              <p className="text-xs font-semibold text-[var(--ink)] truncate max-w-[130px]">
                {displayName}
              </p>
              <p className="text-[10px] text-[var(--muted)] font-medium truncate max-w-[130px]">
                {roleInfo.badge}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative flex flex-1 min-h-0">
        {/* Mobile Scrim */}
        {mobileOpen && !isDesktop && <div className="sidebar-scrim lg:hidden" aria-hidden="true" />}

        {/* Sidebar */}
        <aside
          id="app-sidebar"
          ref={asideRef}
          tabIndex={-1}
          aria-label="Main navigation"
          className={[
            'dashboard-sidebar bg-white border-r border-[var(--border-light)]',
            'flex flex-col shrink-0 outline-none z-40',
            // Mobile off-canvas drawer
            'max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:w-[260px] max-lg:shadow-2xl',
            'max-lg:transition-transform max-lg:duration-200 max-lg:ease-out',
            mobileOpen
              ? 'max-lg:translate-x-0 max-lg:visible'
              : 'max-lg:-translate-x-full max-lg:invisible max-lg:pointer-events-none',
            // Desktop collapsible rail
            'lg:visible lg:relative lg:transition-[width] lg:duration-200 lg:ease-out',
            hideLabels ? 'lg:w-[76px]' : 'lg:w-[250px]',
          ].join(' ')}
        >
          <div className="flex-1 h-full flex flex-col overflow-y-auto">
            {/* App Header & Logo */}
            <div className="p-4 border-b border-[var(--border-light)] shrink-0">
              <div className="flex items-center gap-3">
                <Logo variant="prenatrack" size={38} rounded priority className="shadow-xs shrink-0" />
                {!hideLabels && (
                  <div className="min-w-0">
                    <p className="font-bold text-[var(--ink)] text-base leading-tight tracking-tight truncate">
                      Prenatrack
                    </p>
                    <p className="text-[11px] text-[var(--muted)] truncate font-medium mt-0.5">
                      Barangay Maternal Care
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Block Under Logo */}
            {!hideLabels && (
              <div className="p-3.5 m-3 rounded-2xl bg-gradient-to-br from-[var(--brand-light)]/60 via-[var(--surface-alt)] to-white border border-[var(--brand-subtle)]/70 shadow-xs shrink-0">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-[var(--brand)] text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[var(--ink)] truncate">
                      {displayName}
                    </p>
                    <p className="text-[10px] text-[var(--muted)] truncate font-medium">
                      {roleInfo.subtitle || roleInfo.title}
                    </p>
                    <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold uppercase tracking-wider text-[var(--brand-dark)] bg-white/80 px-2 py-0.5 rounded-full border border-[var(--brand-subtle)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                      {roleInfo.badge}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {!hideLabels && (
              <p className="px-5 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-2)] shrink-0">
                Navigation
              </p>
            )}

            {/* Menu Items */}
            <nav className="px-3 space-y-1 pb-4" aria-label="Main menu">
              {menuItems.map((item) => {
                const Icon = ICONS[item.icon ?? ''] ?? FileText;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    title={hideLabels ? item.label : undefined}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      active
                        ? 'bg-[var(--brand-light)] text-[var(--brand-dark)] font-semibold shadow-xs'
                        : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-alt)]'
                    }`}
                  >
                    <Icon
                      size={18}
                      className={`shrink-0 transition-colors ${
                        active ? 'text-[var(--brand)]' : 'text-[var(--muted-2)] group-hover:text-[var(--ink)]'
                      }`}
                      aria-hidden="true"
                    />
                    {!hideLabels && (
                      <span className="flex-1 truncate tracking-tight">{item.label}</span>
                    )}
                    {!hideLabels && active && (
                      <ChevronRight size={14} className="text-[var(--brand)] shrink-0 stroke-[2.5]" />
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="px-3 pb-4 mt-auto shrink-0 border-t border-[var(--border-light)] pt-3">
              <LogoutButton collapsed={hideLabels} />
            </div>
          </div>
        </aside>

        {/* Main Content Scroll Container */}
        <main className="dashboard-main flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[var(--background)]">
          {children}
        </main>
      </div>
    </div>
  );
}
