'use client';

import { useState } from 'react';
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
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Top bar with burger - visible on ALL screen sizes */}
      <div className="relative z-[999] flex items-center justify-between p-4 bg-white border-b">
        <button
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          {/* Simple burger icon (3 lines) */}
          <div className="w-6 h-0.5 bg-gray-700 mb-1.5"></div>
          <div className="w-6 h-0.5 bg-gray-700 mb-1.5"></div>
          <div className="w-6 h-0.5 bg-gray-700"></div>
        </button>
        <h2 className="font-semibold text-lg">Health System</h2>
        <div className="w-10"></div> {/* spacer to keep title centered */}
      </div>

      {/* Overlay when open - all screen sizes */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-[1000]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar itself - always fixed/slide-in, all screen sizes */}
      <aside
        className={`
          bg-white border-r flex flex-col z-[1001]
          fixed top-0 left-0 h-full w-64
          transform transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-5 border-b">
          <h2 className="font-semibold text-lg">Health System</h2>
          <p className="text-xs text-gray-500 mt-1 capitalize">
            {role.replace('_', ' ')}
          </p>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.length === 0 && (
            <p className="text-sm text-gray-400 px-3 py-2">
              No menu available for this role yet.
            </p>
          )}
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t">
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}