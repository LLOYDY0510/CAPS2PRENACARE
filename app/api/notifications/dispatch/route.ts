import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { STAFF_ROLES } from '@/utils/auth/roles';
import { createMaternalNotification } from '@/utils/notifications';
import { createHash } from 'crypto';

type DispatchBody = {
  type: 'appointment' | 'health_tip' | 'risk_alert' | 'care_message';
  scheduleId?: string;
  broadcastId?: string;
  pregnantMotherId?: string;
  pregnantMotherIds?: string[];
  title?: string;
  message?: string;
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile?.role || !STAFF_ROLES.includes(profile.role as (typeof STAFF_ROLES)[number])) {
    return NextResponse.json({ error: 'You are not authorized to create notifications.' }, { status: 403 });
  }

  const body = await request.json() as DispatchBody;
  const notificationKey = (motherId: string, title: string, message: string) =>
    createHash('sha256').update(`${user.id}:${motherId}:${title}:${message}`).digest('hex');
  const targets: { id: string; eventKey: string; category: 'health_tip' | 'appointment' | 'risk_alert' | 'care_message'; title: string; message: string }[] = [];

  if (body.type === 'appointment' && body.scheduleId) {
    const [{ data: schedule }, { data: links }] = await Promise.all([
      supabase.from('prenatal_schedules').select('visit_date').eq('id', body.scheduleId).maybeSingle(),
      supabase.from('prenatal_schedule_recipients').select('pregnant_mother_id').eq('schedule_id', body.scheduleId),
    ]);
    if (schedule) {
      for (const link of links ?? []) targets.push({ id: link.pregnant_mother_id, eventKey: `appointment:${body.scheduleId}:${link.pregnant_mother_id}`, category: 'appointment', title: 'Prenatal appointment scheduled', message: `Your prenatal appointment is scheduled for ${schedule.visit_date}. Please visit the Barangay Health Center on that date.` });
    }
  }

  if (body.type === 'health_tip' && body.broadcastId) {
    const [{ data: broadcast }, { data: links }] = await Promise.all([
      supabase.from('tip_broadcasts').select('title, content').eq('id', body.broadcastId).maybeSingle(),
      supabase.from('tip_broadcast_recipients').select('pregnant_mother_id').eq('broadcast_id', body.broadcastId),
    ]);
    if (broadcast) {
      for (const link of links ?? []) targets.push({ id: link.pregnant_mother_id, eventKey: `health-tip:${body.broadcastId}:${link.pregnant_mother_id}`, category: 'health_tip', title: broadcast.title, message: broadcast.content });
    }
  }

  if (body.type === 'risk_alert' && body.pregnantMotherId && body.message) {
    const title = body.title || 'Important maternal health alert';
    targets.push({ id: body.pregnantMotherId, eventKey: `risk-alert:${notificationKey(body.pregnantMotherId, title, body.message)}`, category: 'risk_alert', title, message: body.message });
  }

  if (body.type === 'care_message' && body.pregnantMotherIds?.length && body.title && body.message) {
    for (const id of body.pregnantMotherIds) targets.push({ id, eventKey: `care-message:${notificationKey(id, body.title, body.message)}`, category: 'care_message', title: body.title, message: body.message });
  }

  let created = 0;
  for (const target of targets) {
    if (await createMaternalNotification(supabase, { pregnantMotherId: target.id, eventKey: target.eventKey, category: target.category, title: target.title, message: target.message })) created++;
  }

  return NextResponse.json({ success: true, created });
}