import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  try {
    const { numbers, message } = await req.json();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
      return NextResponse.json(
        { error: 'No recipient numbers provided.' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
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
      sent_by: user?.id ?? null,
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('SMS send error:', err);
    return NextResponse.json(
      { error: 'Something went wrong sending the SMS.' },
      { status: 500 }
    );
  }
}