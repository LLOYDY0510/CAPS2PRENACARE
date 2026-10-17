'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import LogoutButton from './LogoutButton';
import type { MenuItem } from './Sidebar';

export default function AppShell({ menuItems, fullName, role, children }: {
  menuItems: MenuItem[]; fullName?: string | null; role: string; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(()=>{void fetch('/api/activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'view',path:pathname})});},[pathname]);
  return <div className="app-shell">
    <button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open}><Menu size={22}/></button>
    {open && <button className="nav-overlay" aria-label="Close navigation" onClick={() => setOpen(false)}/>}
    <aside className={`app-sidebar ${open ? 'is-open' : ''}`} aria-label="Main navigation">
      <div className="flex justify-between items-center"><Link href="/dashboard" className="text-xl font-bold">PrenaTrack</Link><button className="md:hidden p-2" aria-label="Close navigation" onClick={() => setOpen(false)}><X size={20}/></button></div>
      <p className="text-sm mt-3 mb-8">{fullName || role}</p>
      <nav className="flex-1 space-y-1">{menuItems.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={pathname === item.href ? 'page' : undefined} className={`nav-link ${pathname === item.href ? 'selected' : ''}`}>{item.label}</Link>)}</nav>
      <div className="border-t pt-4 mt-6"><LogoutButton/></div>
    </aside>
    <main id="main-content" className="app-main">{children}</main>
  </div>;
}
