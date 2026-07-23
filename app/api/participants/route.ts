import { NextResponse } from 'next/server';
import { APPS_SCRIPT_URL } from '@/app/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const appsScriptUrl = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || APPS_SCRIPT_URL;

  try {
    const targetUrl = `${appsScriptUrl}?action=getParticipants`;
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
      redirect: 'follow',
    });

    const responseText = await res.text();

    // Check if the response is valid JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      // Apps Script returned non-JSON (e.g. Google Login redirect HTML or Error page)
      return NextResponse.json(
        {
          error:
            'Google Apps Script mengembalikan halaman HTML/Login alih-alih JSON. Pastikan di Apps Script deployment: "Execute as: Me" dan "Who has access: Anyone".',
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
    console.error('Proxy participants error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server proxy error' },
      { status: 500 }
    );
  }
}
