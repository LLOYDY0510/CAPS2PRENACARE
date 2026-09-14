import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import Sidebar from '@/components/layout/Sidebar';
import { checkAndSendPrenatalReminders } from '@/utils/checkPrenatalReminders';
import { isStaffRole } from '@/utils/auth/roles';

export const dynamic = 'force-dynamic';

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
    { label: 'Messages', href: '/dashboard' },
    { label: 'Prenatal Schedule', href: '/dashboard/my-schedule' },
    { label: 'My Information', href: '/dashboard/my-info' },
    { label: 'Medical Records', href: '/dashboard/my-records' },
  ],
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await checkAndSendPrenatalReminders();

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
  if (!isStaffRole(role) && role !== 'pregnant_mother') redirect('/login');
  const menuItems = MENUS[role] ?? [];

  return (
    <Sidebar
      role={role}
      menuItems={menuItems}
      fullName={profile?.full_name}
      email={user.email}
    >
      {children}
    </Sidebar>
  );
}