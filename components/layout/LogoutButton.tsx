'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { clearRememberPreference } from '@/utils/auth/session-persistence';

export default function LogoutButton({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    clearRememberPreference();
    router.push('/login');
    router.refresh();
  }

  return collapsed ? (
    <button
      type="button"
      onClick={handleLogout}
      aria-label="Log out"
      className="relative group w-12 h-12 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 flex items-center justify-center transition-all duration-200 hover:scale-105"
    >
      <LogOut size={20} className="stroke-[2.2]" aria-hidden="true" />
      <span className="absolute left-16 px-3 py-1.5 bg-slate-900/90 text-white text-xs font-semibold rounded-xl shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
        Log out
      </span>
    </button>
  ) : (
    <button
      type="button"
      onClick={handleLogout}
      aria-label="Log out"
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
    >
      <LogOut size={16} aria-hidden="true" />
      <span>Log out</span>
    </button>
  );
}
