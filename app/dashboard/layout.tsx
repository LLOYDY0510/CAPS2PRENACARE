import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import Sidebar from '@/components/Sidebar';
 
export const dynamic = 'force-dynamic';
 
// Menu items per role. Add more roles here as we build them out.
const MENUS: Record<string, { label: string; href: string }[]> = {
  bhw_head: [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Risk Map', href: '/dashboard/risk-map' },
    { label: 'Pregnant Records', href: '/dashboard/pregnant' },
    { label: 'Prenatal Schedule', href: '/dashboard/schedule' },
    { label: 'Prenatal Checkups', href: '/dashboard/checkups' },
    { label: 'SMS Log', href: '/dashboard/sms-log' },
    { label: 'Manage BHW (Purok)', href: '/dashboard/bhw' },
    { label: 'Reports', href: '/dashboard/reports' },
  ],
  admin: [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Risk Map', href: '/dashboard/risk-map' },
    { label: 'Pregnant Records', href: '/dashboard/pregnant' },
    { label: 'Manage Users', href: '/dashboard/users' },
    { label: 'Reports', href: '/dashboard/reports' },
  ],
    nurse: [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Pregnant Records', href: '/dashboard/pregnant' },
  ],
    pregnant_mother: [
    { label: 'Dashboard', href: '/dashboard' },
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
    <div className="min-h-screen bg-background flex">
      <Sidebar role={role} menuItems={menuItems} />
      {/* Main content */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
 