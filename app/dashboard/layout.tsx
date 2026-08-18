import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import Sidebar from '@/components/Sidebar';

// Menu items per role. Add more roles here as we build them out.
const MENUS: Record<string, { label: string; href: string }[]> = {
  bhw_head: [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Manage BHW (Purok)', href: '/dashboard/bhw' },
    { label: 'Pregnant Records', href: '/dashboard/pregnant' },
    { label: 'Prenatal Schedule', href: '/dashboard/schedule' },
    { label: 'Risk Map', href: '/dashboard/risk-map' },
    { label: 'Reports', href: '/dashboard/reports' },
  ],
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  const role = profile?.role ?? 'pending';
  const menuItems = MENUS[role] ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role={role} menuItems={menuItems} />
      {/* Main content */}
      <main className="p-8">{children}</main>
    </div>
  );
}