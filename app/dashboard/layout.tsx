import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import Sidebar from '@/components/layout/Sidebar';
import SessionPersistenceGuard from '@/components/auth/SessionPersistenceGuard';
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
  bhw_purok: [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Pregnant Records', href: '/dashboard/pregnant' },
    { label: 'Prenatal Checkups', href: '/dashboard/checkups' },
    { label: 'Prenatal Schedule (View Only)', href: '/dashboard/schedule' },
    { label: 'Risk Map (View Only)', href: '/dashboard/risk-map' },
    { label: 'Reports', href: '/dashboard/reports' },
  ],
  admin: [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Risk Map', href: '/dashboard/risk-map' },
    { label: 'Pregnant Records', href: '/dashboard/pregnant' },
    { label: 'Prenatal Schedule', href: '/dashboard/schedule' },
    { label: 'Manage Users', href: '/dashboard/users' },
    { label: 'SMS Log', href: '/dashboard/sms-log' },
    { label: 'Reports', href: '/dashboard/reports' },
  ],
  nurse: [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Pregnant Records', href: '/dashboard/pregnant' },
    { label: 'Prenatal Schedule', href: '/dashboard/schedule' },
    { label: 'Prenatal Checkups', href: '/dashboard/checkups' },
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
  // The reminder job marks prenatal_schedules.reminder_sent, which is reserved
  // for the roles that manage schedules (admin / nurse / BHW Head). A BHW
  // (Purok) is read-only on schedules, so running it for them would attempt a
  // write the database refuses and re-send the same SMS on every page view.
  if (role === 'admin' || role === 'nurse' || role === 'bhw_head') {
    // The reminder job only needs to run once per request, and only for the
    // roles allowed to write prenatal_schedules.reminder_sent. A BHW (purok)
    // is read-only there, so running it for them would attempt a write the
    // database refuses.
    await checkAndSendPrenatalReminders();
  }
  const menuItems = MENUS[role] ?? [];

  // BHW purok users do not receive notifications (see 008_remove_bhw_purok_
  // notifications.sql). For everyone else the rows are already scoped by
  // RLS; the filter below only mirrors that rule so the bell can never render
  // a row the database considered someone else's.
  let notifications: Array<{ id: string; title: string; message: string; category: string; read_at: string | null; created_at: string }> = [];

  if (role !== 'bhw_purok') {
    const { data: notificationRows } = await supabase
      .from('maternal_notifications')
      .select('id, pregnant_mother_id, recipient_user_id, recipient_role, recipient_purok, title, message, category, read_at, created_at')
      .order('created_at', { ascending: false })
      .limit(80);
    notifications = (notificationRows ?? [])
      .filter((notification) => (
        notification.recipient_user_id === user.id ||
        (isStaffRole(role) &&
          (notification.recipient_role === null || notification.recipient_role === role)) ||
        (role === 'pregnant_mother' &&
          !!profile?.pregnant_mother_id &&
          notification.pregnant_mother_id === profile.pregnant_mother_id)
      ))
      .slice(0, 40)
      .map(({ id, title, message, category, read_at, created_at }) => ({ id, title, message, category, read_at, created_at }));
  }

  return (
    <>
      {/* Enforces the "remember me" choice made at sign-in; renders nothing. */}
      <SessionPersistenceGuard />
      <Sidebar
        role={role}
        menuItems={menuItems}
        fullName={profile?.full_name}
        email={user.email}
        notifications={notifications}
      >
        {children}
      </Sidebar>
    </>
  );
}