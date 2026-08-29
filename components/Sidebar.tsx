'use client';
 
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
 
type MenuItem = { label: string; href: string };
 
export default function Sidebar({
  role,
  menuItems,
}: {
  role: string;
  menuItems: MenuItem[];
}) {
  return (
    <aside className="bg-ink-dark flex flex-col w-64 shrink-0 h-screen sticky top-0">
      <div className="p-5 border-b border-white/10">
        <h2 className="font-display text-xl text-white">Prenatrack</h2>
        <p className="text-xs text-brand mt-1 capitalize tracking-wide">
          {role.replace('_', ' ')}
        </p>
      </div>
 
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.length === 0 && (
          <p className="text-sm text-white/40 px-3 py-2">
            No menu available for this role yet.
          </p>
        )}
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block px-3 py-2 rounded-lg text-sm text-white/80 hover:bg-white/10 hover:text-white transition"
          >
            {item.label}
          </Link>
        ))}
      </nav>
 
      <div className="p-3 border-t border-white/10">
        <LogoutButton />
      </div>
    </aside>
  );
}
 