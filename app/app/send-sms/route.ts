import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { numbers, message } = await req.json();

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

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.message || 'Failed to send SMS.' },
        { status: 500 }
      );
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