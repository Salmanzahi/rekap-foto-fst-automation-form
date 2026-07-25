import { NextRequest, NextResponse } from 'next/server';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { APPS_SCRIPT_URL } from '@/app/lib/config';

// R2 Configuration from environment variables
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';

function getS3Client() {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    return null;
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

function extractR2Key(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.replace(/^\//, '');
    return pathname || null;
  } catch {
    if (url.includes('rekap-foto/')) {
      return url.substring(url.indexOf('rekap-foto/'));
    }
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, rowIndex, photoUrls } = body;

    if (!name) {
      return NextResponse.json({ error: 'Nama peserta diperlukan' }, { status: 400 });
    }

    // 1. Delete associated photo objects from R2 storage (if any)
    if (photoUrls && Array.isArray(photoUrls) && photoUrls.length > 0) {
      const s3Client = getS3Client();
      if (s3Client) {
        for (const photoUrl of photoUrls) {
          const key = extractR2Key(photoUrl);
          if (key) {
            try {
              await s3Client.send(
                new DeleteObjectCommand({
                  Bucket: R2_BUCKET_NAME,
                  Key: key,
                })
              );
            } catch (err) {
              console.warn('Gagal menghapus objek R2:', key, err);
            }
          }
        }
      }
    }

    // 2. Delete row from Google Apps Script Spreadsheet
    const appsScriptUrl = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || APPS_SCRIPT_URL;
    const res = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete',
        name: name,
        rowIndex: rowIndex,
      }),
      redirect: 'follow',
    });

    const data = await res.json().catch(() => ({ success: true }));

    if (!res.ok || data.error) {
      return NextResponse.json(
        { error: data.error || 'Gagal menghapus data dari Google Spreadsheet' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Data responden "${name}" dan foto berhasil dihapus.`,
      data,
    });
  } catch (error) {
    console.error('Delete API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal menghapus data' },
      { status: 500 }
    );
  }
}
