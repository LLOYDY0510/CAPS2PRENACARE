'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function LogoutButton() {
  const router   = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors"
      style={{
        color: '#F87171',
        background: 'transparent',
        border: '1px solid rgba(248,113,113,0.25)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0" aria-hidden>
        <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3"/>
        <path d="M10 11l3-3-3-3M13 8H6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Log out
    </button>
  );
}
