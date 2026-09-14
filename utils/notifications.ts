import type { SupabaseClient } from '@supabase/supabase-js';

type NotificationInput = {
  pregnantMotherId: string;
  eventKey: string;
  category: 'health_tip' | 'prenatal_reminder' | 'appointment' | 'missed_visit' | 'risk_alert' | 'care_message';
  title: string;
  message: string;
};

type NotificationClient = SupabaseClient;

export async function createMaternalNotification(
  supabase: NotificationClient,
  input: NotificationInput,
) {
  const { data: mother } = await supabase
    .from('pregnant_mothers')
    .select('id, full_name')
    .eq('id', input.pregnantMotherId)
    .maybeSingle();
  if (!mother) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('pregnant_mother_id', input.pregnantMotherId)
    .maybeSingle();
  const email = profile?.email?.trim().toLowerCase() || null;

  const { data: notification, error } = await supabase
    .from('maternal_notifications')
    .insert({
      pregnant_mother_id: input.pregnantMotherId,
      event_key: input.eventKey,
      category: input.category,
      title: input.title,
      message: input.message,
      email,
      email_status: email && process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL ? 'pending' : 'skipped',
    })
    .select('id, email, email_status')
    .maybeSingle();

  if (error?.code === '23505') return null;
  if (error || !notification || notification.email_status === 'skipped' || !notification.email) return notification;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [notification.email],
        subject: input.title,
        text: `${input.message}\n\nOpen Prenatrack to view this update.`,
      }),
    });
    const provider = await response.text();
    await supabase.from('maternal_notifications').update({
      email_status: response.ok ? 'sent' : 'failed',
      email_sent_at: response.ok ? new Date().toISOString() : null,
      email_error: response.ok ? null : provider,
    }).eq('id', notification.id);
  } catch (emailError) {
    await supabase.from('maternal_notifications').update({
      email_status: 'failed',
      email_error: emailError instanceof Error ? emailError.message : String(emailError),
    }).eq('id', notification.id);
  }

  return notification;
}