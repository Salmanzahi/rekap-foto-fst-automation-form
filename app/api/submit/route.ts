import { NextRequest, NextResponse } from 'next/server';
import { APPS_SCRIPT_URL } from '@/app/lib/config';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const appsScriptUrl = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || APPS_SCRIPT_URL;

  try {
    const body = await request.json();

    const res = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(body),
      redirect: 'follow',
    });

    const responseText = await res.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        {
          error:
            'Google Apps Script mengembalikan respon non-JSON. Pastikan "Execute as: Me" dan "Who has access: Anyone".',
          details: responseText.substring(0, 300),
        },
        { status: 500 }
      );
    }

    if (!res.ok || data.error) {
      return NextResponse.json(
        { error: data.error || `Error dari Apps Script (HTTP ${res.status})` },
        { status: res.status >= 400 ? res.status : 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Proxy submit error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server proxy error' },
      { status: 500 }
    );
  }
}
