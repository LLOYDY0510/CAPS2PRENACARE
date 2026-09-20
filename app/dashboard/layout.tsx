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
    { label: 'Risk Indicators', href: '/dashboard/risk-indicators' },
    { label: 'Health Tips', href: '/dashboard/health-tips' },
    { label: 'Nutrition Tips', href: '/dashboard/nutrition-tips' },
    { label: 'SMS Log', href: '/dashboard/sms-log' },
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
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, purok, pregnant_mother_id')
    .eq('id', user.id)
    .single();

  const role = profile?.role ?? 'pending';
  if (!isStaffRole(role) && role !== 'pregnant_mother') redirect('/login');
  if (isStaffRole(role)) await checkAndSendPrenatalReminders();
  const menuItems = MENUS[role] ?? [];

  const { data: notificationRows } = await supabase
    .from('maternal_notifications')
    .select('id, pregnant_mother_id, recipient_user_id, recipient_role, recipient_purok, title, message, category, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(80);
  const notifications = (notificationRows ?? [])
    .filter((notification) => (
      notification.recipient_user_id === user.id ||
      notification.recipient_role === role ||
      (role === 'bhw_purok' && notification.recipient_purok === profile?.purok) ||
      (role === 'pregnant_mother' && notification.pregnant_mother_id === profile?.pregnant_mother_id)
    ))
    .slice(0, 40)
    .map(({ id, title, message, category, read_at, created_at }) => ({ id, title, message, category, read_at, created_at }));

  return (
    <Sidebar
      role={role}
      menuItems={menuItems}
      fullName={profile?.full_name}
      email={user.email}
      notifications={notifications}
    >
      {children}
    </Sidebar>
  );
}