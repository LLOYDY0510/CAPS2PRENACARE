'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from '@/components/layout/LogoutButton';

type MenuItem = { label: string; href: string };

const ROLE_DISPLAY: Record<string, { title: string; sub: string }> = {
  admin:           { title: 'Administrator',   sub: 'Midwife / Admin' },
  bhw_head:        { title: 'BHW Head',         sub: 'Barangay Health Worker' },
  bhw_purok:       { title: 'BHW (Purok)',       sub: 'Barangay Health Worker' },
  nurse:           { title: 'Nurse',             sub: 'Health Personnel' },
  pregnant_mother: { title: 'Patient Portal',   sub: 'Pregnant Mother' },
};

const NAV_ICONS: Record<string, React.ReactElement> = {
  Dashboard: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0" aria-hidden>
      <rect x="1" y="1" width="6" height="6" rx="1"/>
      <rect x="9" y="1" width="6" height="6" rx="1"/>
      <rect x="1" y="9" width="6" height="6" rx="1"/>
      <rect x="9" y="9" width="6" height="6" rx="1"/>
    </svg>
  ),
  'Risk Map': (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0" aria-hidden>
      <path d="M8 1C5.8 1 4 2.8 4 5c0 3 4 9 4 9s4-6 4-9c0-2.2-1.8-4-4-4z"/>
      <circle cx="8" cy="5" r="1.25" fill="currentColor" stroke="none"/>
    </svg>
  ),
  'Pregnant Records': (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0" aria-hidden>
      <rect x="2" y="1" width="12" height="14" rx="1.5"/>
      <path d="M5 5h6M5 8h6M5 11h4"/>
    </svg>
  ),
  'Prenatal Schedule': (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0" aria-hidden>
      <rect x="1" y="3" width="14" height="12" rx="1.5"/>
      <path d="M1 7h14M5 1v4M11 1v4"/>
    </svg>
  ),
  'Prenatal Checkups': (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0" aria-hidden>
      <path d="M8 2v12M2 8h12" strokeLinecap="round"/>
      <circle cx="8" cy="8" r="6.5"/>
    </svg>
  ),
  'SMS Log': (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0" aria-hidden>
      <path d="M1.5 2.5h13a1 1 0 011 1v7a1 1 0 01-1 1H5l-3.5 2V3.5a1 1 0 011-1z"/>
    </svg>
  ),
  'Manage BHW (Purok)': (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0" aria-hidden>
      <circle cx="6" cy="5" r="2.5"/>
      <path d="M1 14c0-2.8 2.2-5 5-5s5 2.2 5 5"/>
      <circle cx="12.5" cy="5" r="2"/>
      <path d="M15 14c0-2.2-1.6-4-3.5-4"/>
    </svg>
  ),
  'Manage Users': (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0" aria-hidden>
      <circle cx="8" cy="5" r="3"/>
      <path d="M1 14.5c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5"/>
    </svg>
  ),
  Reports: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0" aria-hidden>
      <rect x="2" y="1" width="12" height="14" rx="1.5"/>
      <path d="M5 5h6M5 8h6M5 11h4"/>
      <path d="M11 10l2 2-2 2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  'Risk Indicators': (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0" aria-hidden>
      <path d="M8 2L1.5 13.5h13L8 2z" strokeLinejoin="round"/>
      <path d="M8 6v4M8 11.5v.5" strokeLinecap="round"/>
    </svg>
  ),
  'Health Tips': (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0" aria-hidden>
      <path d="M8 1a5 5 0 00-2 9.6V12h4v-1.4A5 5 0 008 1z"/>
      <path d="M6 14h4M6.5 15.5h3"/>
    </svg>
  ),
};

function MenuIcon({ label }: { label: string }): React.ReactElement {
  return NAV_ICONS[label] ?? (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0" aria-hidden>
      <circle cx="8" cy="8" r="2"/>
    </svg>
  );
}

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
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  /* Clear any pending close timer */
  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  /* Open immediately on mouse enter */
  function handleMouseEnter() {
    cancelClose();
    setOpen(true);
  }

  /* Close with a tiny delay so accidental mouse-out doesn't flash */
  function handleMouseLeave() {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }

  /* Close immediately after a nav link is clicked */
  const handleNavClick = useCallback(() => {
    cancelClose();
    setOpen(false);
  }, []);

  /* Hamburger toggle still works for touch / keyboard */
  function handleToggle() {
    cancelClose();
    setOpen((o) => !o);
  }

  /* Clean up timer on unmount */
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const display = ROLE_DISPLAY[role] ?? {
    title: role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    sub: 'Staff',
  };
  const initials = (fullName ?? email ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: 'var(--background)' }}
    >
      {/* ── Top bar ── */}
      <header
        className="shrink-0 flex items-center justify-between px-4 z-30"
        style={{
          background: '#1A2F3A',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          height: '52px',
        }}
      >
        <div className="flex items-center gap-3">
          {/* Hamburger — still works for touch */}
          <button
            onClick={handleToggle}
            aria-label={open ? 'Close sidebar' : 'Open sidebar'}
            style={{ color: 'rgba(255,255,255,0.6)' }}
            className="p-1.5 rounded hover:text-white transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5" aria-hidden>
              <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round"/>
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded overflow-hidden relative shrink-0">
              <Image src="/logo.jpg" alt="" fill className="object-cover" />
            </div>
            <span
              className="text-sm font-semibold"
              style={{ color: '#fff', letterSpacing: '-0.01em' }}
            >
              Prenatrack
            </span>
          </div>
        </div>

        {/* User chip */}
        <div className="flex items-center gap-2">
          {(fullName || email) && (
            <span className="text-xs hidden sm:block" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {fullName ?? email}
            </span>
          )}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
            style={{ background: 'var(--brand)', color: '#fff' }}
            title={fullName ?? email ?? 'User'}
          >
            {initials}
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 relative">

        {/* ── Sidebar ──
            Position: absolute so it overlays content when open.
            z-index above main so it slides over without pushing layout.
            Hover zone: the thin 8px rail is always present and triggers open. */}
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            /* Always occupy at least 8px so hover can trigger even when closed */
            width: open ? '220px' : '8px',
            zIndex: 20,
            transition: 'width 0.18s ease',
          }}
        >
          <aside
            style={{
              width: '220px',
              height: '100%',
              background: '#fff',
              borderRight: '1px solid var(--border)',
              boxShadow: open ? '2px 0 12px rgba(0,0,0,0.08)' : 'none',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              transform: open ? 'translateX(0)' : 'translateX(-220px)',
              transition: 'transform 0.18s ease, box-shadow 0.18s ease',
            }}
          >
            <div className="h-full flex flex-col overflow-y-auto">

              {/* Role identity */}
              <div
                className="px-4 py-3 shrink-0"
                style={{ borderBottom: '1px solid var(--border-light)' }}
              >
                <p className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>
                  {display.title}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {display.sub}
                </p>
              </div>

              {/* Nav label */}
              <p
                className="px-4 pt-4 pb-1 text-xs font-semibold shrink-0"
                style={{ color: 'var(--muted-2)', letterSpacing: '0.07em' }}
              >
                NAVIGATION
              </p>

              {/* Nav links */}
              <nav className="px-2 pb-2 flex-1">
                {menuItems.length === 0 && (
                  <p className="px-3 py-2 text-xs" style={{ color: 'var(--muted-2)' }}>
                    No menu available.
                  </p>
                )}
                {menuItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleNavClick}
                      className="flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors"
                      style={{
                        color: active ? 'var(--brand)' : 'var(--ink-secondary)',
                        background: active ? 'var(--brand-light)' : 'transparent',
                        fontWeight: active ? 500 : 400,
                        marginBottom: '1px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <MenuIcon label={item.label} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Logout */}
              <div
                className="px-2 pb-3 pt-2 shrink-0"
                style={{ borderTop: '1px solid var(--border-light)' }}
              >
                <LogoutButton />
              </div>
            </div>
          </aside>
        </div>

        {/* ── Page content ──
            Always full-width; sidebar overlays it rather than pushing it. */}
        <main
          className="flex-1 overflow-y-auto"
          style={{ padding: '1.5rem' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
