'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Baby,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  MessageSquare,
  Salad,
  Search,
  Send,
  User,
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
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const [openAt, setOpenAt] = useState<string | null>(null);
  const mobileOpen = openAt === pathname;
  const [isDesktop, setIsDesktop] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

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

  // Click outside user dropdown to close it
  useEffect(() => {
    if (!userDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userDropdownOpen]);

  const displayName = fullName || email?.split('@')[0] || 'User';
  const roleInfo = ROLE_LABELS[role] ?? { title: role.replace('_', ' '), subtitle: '', badge: 'Staff' };
  const initials = displayName.charAt(0).toUpperCase();

  // Determine Page Title based on route
  const activeItem = menuItems.find((item) => item.href === pathname);
  let pageTitle = activeItem?.label ?? 'Overview';
  if (pathname.includes('/pregnant/new')) pageTitle = 'New Pregnant Record';
  else if (pathname.includes('/pregnant/')) pageTitle = 'Record Details';
  else if (pathname.includes('/risk-list')) pageTitle = 'Risk List';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#eef3f7] font-sans text-slate-800 flex items-center justify-center p-0 md:p-3 lg:p-5">
      {/* Soft Blurred Background Decorative Circles */}
      <div
        aria-hidden="true"
        className="fixed -top-32 -left-32 w-96 h-96 rounded-full bg-teal-200/40 blur-3xl pointer-events-none z-0"
      />
      <div
        aria-hidden="true"
        className="fixed -bottom-40 -right-40 w-[32rem] h-[32rem] rounded-full bg-indigo-200/35 blur-3xl pointer-events-none z-0"
      />
      <div
        aria-hidden="true"
        className="fixed top-1/3 -right-20 w-80 h-80 rounded-full bg-amber-100/50 blur-3xl pointer-events-none z-0"
      />

      {/* Main Big Bubbly Container */}
      <div className="relative z-10 w-full h-full max-w-[1680px] bg-[#f4f7f6]/95 backdrop-blur-xl border-0 md:border md:border-white/80 rounded-none md:rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row p-2 sm:p-4 lg:p-5 gap-3 lg:gap-5">
        
        {/* Mobile Scrim */}
        {mobileOpen && !isDesktop && (
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
            onClick={() => setOpenAt(null)}
            aria-hidden="true"
          />
        )}

        {/* ── DESKTOP FLOATING PILL SIDEBAR ── */}
        <aside
          id="app-sidebar"
          ref={asideRef}
          tabIndex={-1}
          aria-label="Main navigation"
          className={[
            'z-40 shrink-0 flex flex-col items-center justify-between bg-white border border-white/90 shadow-xl shadow-slate-200/50',
            // Mobile Drawer
            'max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:w-64 max-lg:rounded-r-[32px] max-lg:p-5 max-lg:transition-transform max-lg:duration-300 max-lg:ease-out',
            mobileOpen
              ? 'max-lg:translate-x-0 max-lg:visible'
              : 'max-lg:-translate-x-full max-lg:invisible max-lg:pointer-events-none',
            // Desktop Pill — overflow-visible so tooltips can escape the pill boundary
            'lg:visible lg:relative lg:translate-x-0 lg:w-[84px] lg:h-full lg:rounded-[36px] lg:py-6 lg:px-3 lg:my-auto lg:overflow-visible',
          ].join(' ')}
        >
          {/* Logo at Top */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <Link href="/dashboard" className="w-13 h-13 rounded-full bg-teal-50/80 hover:bg-teal-100/80 text-[var(--brand)] flex items-center justify-center transition-all duration-200 shadow-xs">
              <Logo variant="prenatrack" size={32} priority />
            </Link>
            {!isDesktop && (
              <div className="text-center mt-2 border-b border-slate-100 pb-3 w-full">
                <p className="font-bold text-slate-800 text-base">Prenatrack</p>
                <p className="text-xs text-slate-500 font-medium">{roleInfo.title}</p>
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 my-4 flex flex-col items-center w-full min-h-0 lg:overflow-visible" aria-label="Main menu">
            <div className="flex flex-col items-center gap-3 w-full overflow-y-auto no-scrollbar py-2 lg:overflow-visible">
              {menuItems.map((item) => {
                const Icon = ICONS[item.icon ?? ''] ?? FileText;
                const active = pathname === item.href;
                return isDesktop ? (
                  /* Desktop Icon Button with Tooltip */
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`relative group w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                      active
                        ? 'bg-[var(--brand)] text-white shadow-md shadow-teal-700/30 scale-105'
                        : 'bg-slate-100/80 text-slate-500 hover:bg-teal-50 hover:text-[var(--brand)] hover:scale-105'
                    }`}
                  >
                    <Icon size={20} className="stroke-[2.2]" />
                    <span className="absolute left-16 px-3 py-1.5 bg-slate-900/90 text-white text-xs font-semibold rounded-xl shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50 top-1/2 -translate-y-1/2">
                      {item.label}
                    </span>
                  </Link>
                ) : (
                  /* Mobile Drawer Item with Text */
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpenAt(null)}
                    aria-current={active ? 'page' : undefined}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all ${
                      active
                        ? 'bg-[var(--brand)] text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Bottom Logout */}
          <div className="shrink-0 flex items-center justify-center w-full pt-2">
            {isDesktop ? (
              <LogoutButton collapsed={true} />
            ) : (
              <div className="w-full">
                <LogoutButton collapsed={false} />
              </div>
            )}
          </div>

        </aside>

        {/* ── MAIN CONTENT CANVAS ── */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          
          {/* ── FLOATING HEADER ── */}
          <header className="shrink-0 flex items-center justify-between gap-4 px-2 sm:px-4 py-3 z-30">
            
            {/* Left: Burger (Mobile) + Bold Page Title */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                ref={burgerRef}
                type="button"
                onClick={() => setOpenAt(mobileOpen ? null : pathname)}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                className="lg:hidden flex items-center justify-center w-10 h-10 rounded-full bg-white border border-slate-100 shadow-xs text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight truncate">
                  {pageTitle}
                </h1>
              </div>
            </div>

            {/* Center: Wide Pill Search Bar */}
            <div className="hidden md:flex items-center relative max-w-md w-full mx-4">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search records, schedules, patients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-11 pr-4 bg-white/90 hover:bg-white focus:bg-white text-xs sm:text-sm font-medium rounded-full border border-slate-200/80 focus:border-[var(--brand)] text-slate-800 placeholder:text-slate-400 shadow-xs transition-all outline-none"
              />
            </div>

            {/* Right: Notifications & User Profile Dropdown */}
            <div className="flex items-center gap-3 shrink-0">
              
              {/* Notification Bell */}
              <NotificationBell initialNotifications={notifications} />

              {/* User Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-full bg-white border border-slate-100 shadow-xs hover:shadow-md transition-all text-left"
                  aria-expanded={userDropdownOpen}
                >
                  <span className="w-8 h-8 rounded-full bg-[var(--brand)] text-white text-xs font-bold flex items-center justify-center shadow-xs shrink-0">
                    {initials}
                  </span>
                  <span className="hidden sm:block text-xs font-bold text-slate-800 truncate max-w-[110px]">
                    {displayName}
                  </span>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 top-12 z-50 w-56 bg-white border border-slate-100 rounded-3xl shadow-xl p-2 anim-scale-in">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-800 truncate">{displayName}</p>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">{roleInfo.badge} • {roleInfo.title}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        href={role === 'pregnant_mother' ? '/dashboard/my-info' : '/dashboard'}
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <User size={16} className="text-slate-400" />
                        <span>Profile & Info</span>
                      </Link>
                    </div>
                    <div className="border-t border-slate-100 pt-1">
                      <LogoutButton collapsed={false} />
                    </div>
                  </div>
                )}
              </div>

            </div>
          </header>

          {/* ── SCROLLABLE CANVAS CONTENT ── */}
          <main className="dashboard-main flex-1 min-w-0 overflow-y-auto p-2 sm:p-4 lg:p-6 space-y-6">
            {children}
          </main>

        </div>
      </div>
    </div>
  );
}
