import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { STAFF_ROLES } from '@/utils/auth/roles';
import { createMaternalNotification } from '@/utils/notifications';
import { createHash } from 'crypto';

const PHONE_PATTERN = /^\+?[0-9][0-9\- ]{6,19}$/;

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  try {
    const { numbers, message, pregnantMotherIds, messageType = 'care_message' } = await req.json();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (!profile?.role || !STAFF_ROLES.includes(profile.role as (typeof STAFF_ROLES)[number])) {
      return NextResponse.json({ error: 'You are not authorized to send SMS.' }, { status: 403 });
    }

    if (!numbers || !Array.isArray(numbers) || numbers.length === 0 || numbers.length > 100) {
      return NextResponse.json(
        { error: 'No recipient numbers provided.' },
        { status: 400 }
      );
    }

    if (numbers.some((number) => typeof number !== 'string' || !PHONE_PATTERN.test(number.trim()))) {
      return NextResponse.json({ error: 'One or more recipient numbers are invalid.' }, { status: 400 });
    }

    if (!message || typeof message !== 'string' || !message.trim() || message.length > 480) {
      return NextResponse.json(
        { error: 'Message is required.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.SEMAPHORE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'SMS service is not configured.' },
        { status: 500 }
      );
    }

    // Semaphore accepts a comma-separated list of numbers in one request
    const numberList = numbers.join(',');

    const response = await fetch('https://api.semaphore.co/api/v4/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        apikey: apiKey,
        number: numberList,
        message: message,
      }),
    });

    const rawText = await response.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      // Semaphore returned plain text/HTML instead of JSON (e.g. account issue)
      await supabase.from('sms_logs').insert({
        recipient_count: numbers.length,
        recipient_numbers: numbers,
        message,
        status: 'failed',
        delivery_status: 'failed',
          message_type: messageType,
          recipient_mother_ids: Array.isArray(pregnantMotherIds) ? pregnantMotherIds : null,
        error_message: rawText || 'Semaphore returned an unexpected response.',
        sent_by: user?.id ?? null,
      });
      return NextResponse.json(
        { error: rawText || 'Semaphore returned an unexpected response.' },
        { status: 500 }
      );
    }

    if (!response.ok) {
      await supabase.from('sms_logs').insert({
        recipient_count: numbers.length,
        recipient_numbers: numbers,
        message,
        status: 'failed',
        delivery_status: 'failed',
        message_type: messageType,
        recipient_mother_ids: Array.isArray(pregnantMotherIds) ? pregnantMotherIds : null,
        error_message: data?.message || 'Failed to send SMS.',
        sent_by: user?.id ?? null,
      });
      return NextResponse.json(
        { error: data?.message || 'Failed to send SMS.' },
        { status: 500 }
      );
    }

    // Success — log it
    await supabase.from('sms_logs').insert({
      recipient_count: numbers.length,
      recipient_numbers: numbers,
      message,
      status: 'success',
      delivery_status: 'sent',
      message_type: messageType,
      recipient_mother_ids: Array.isArray(pregnantMotherIds) ? pregnantMotherIds : null,
      provider_message_id: Array.isArray(data) ? data[0]?.message_id ?? null : data?.message_id ?? null,
      sent_by: user?.id ?? null,
    });

    if (Array.isArray(pregnantMotherIds)) {
      await Promise.all(pregnantMotherIds.map((pregnantMotherId: unknown) => {
        if (typeof pregnantMotherId !== 'string') return null;
        return createMaternalNotification(supabase, {
          pregnantMotherId,
          eventKey: `care-message:${createHash('sha256').update(`${user.id}:${pregnantMotherId}:${message}`).digest('hex')}`,
          category: 'care_message',
          title: 'Message from your care team',
          message,
        });
      }));
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('SMS send error:', err);
    return NextResponse.json(
      { error: 'Something went wrong sending the SMS.' },
      { status: 500 }
    );
  }
}