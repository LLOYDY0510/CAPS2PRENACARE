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

  return (
    <button
      type="button"
      onClick={handleLogout}
      aria-label="Log out"
      title={collapsed ? 'Log out' : undefined}
      className={`sidebar-link ${collapsed ? 'justify-center' : ''}`}
      style={{ color: 'var(--danger)' }}
    >
      <LogOut className="sidebar-icon" size={18} aria-hidden="true" />
      {!collapsed && <span className="sidebar-label">Log out</span>}
    </button>
  );
}
