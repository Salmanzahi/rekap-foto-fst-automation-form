import { NextRequest, NextResponse } from 'next/server';
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  ListObjectsV2CommandOutput,
} from '@aws-sdk/client-s3';
import JSZip from 'jszip';

// R2 Configuration from environment variables
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';

// Initialize S3 client for R2
function getS3Client() {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    throw new Error(
      'Cloudflare R2 belum disetup. Mohon isi R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, dan R2_BUCKET_NAME di file .env.local'
    );
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

export async function GET(request: NextRequest) {
  return handleDownload(request);
}

export async function POST(request: NextRequest) {
  return handleDownload(request);
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
    if (url.includes('rekap_foto/')) {
      return url.substring(url.indexOf('rekap_foto/'));
    }
    return null;
  }
}

async function handleDownload(request: NextRequest) {
  try {
    const s3Client = getS3Client();

    let targetUrls: string[] | null = null;
    if (request.method === 'POST') {
      try {
        const body = await request.json();
        if (body && Array.isArray(body.photoUrls) && body.photoUrls.length > 0) {
          targetUrls = body.photoUrls;
        }
      } catch {
        // Not a JSON body or empty, fallback to downloading all
      }
    }

    let uniqueKeys: string[] = [];

    if (targetUrls) {
      uniqueKeys = Array.from(
        new Set(
          targetUrls
            .map((url) => extractR2Key(url))
            .filter((key): key is string => Boolean(key) && !key!.endsWith('/'))
        )
      );
    } else {
      // Check for both prefixes in case files were saved with hyphen or underscore
      const prefixes = ['rekap-foto/', 'rekap_foto/'];
      const allContents: { Key?: string; Size?: number }[] = [];

      for (const prefix of prefixes) {
        let isTruncated = true;
        let continuationToken: string | undefined = undefined;

        while (isTruncated) {
          const listedObjects: ListObjectsV2CommandOutput = await s3Client.send(
            new ListObjectsV2Command({
              Bucket: R2_BUCKET_NAME,
              Prefix: prefix,
              ContinuationToken: continuationToken,
            })
          );

          if (listedObjects.Contents) {
            allContents.push(...listedObjects.Contents);
          }

          isTruncated = listedObjects.IsTruncated || false;
          continuationToken = listedObjects.NextContinuationToken;
        }
      }

      uniqueKeys = Array.from(
        new Set(
          allContents
            .map((c) => c.Key)
            .filter((key): key is string => Boolean(key) && !key!.endsWith('/'))
        )
      );
    }

    if (uniqueKeys.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada file foto yang ditemukan untuk diunduh' },
        { status: 404 }
      );
    }

    const zip = new JSZip();
    const BATCH_SIZE = 10;
    let successCount = 0;

    for (let i = 0; i < uniqueKeys.length; i += BATCH_SIZE) {
      const batch = uniqueKeys.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (key) => {
          try {
            const getObj = await s3Client.send(
              new GetObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: key,
              })
            );

            if (getObj.Body) {
              const byteArray = await getObj.Body.transformToByteArray();
              // Format inside zip as rekap_foto/Prodi/Filename...
              const zipPath = key.replace(/^rekap[-_]foto\//, 'rekap_foto/');
              zip.file(zipPath, byteArray);
              successCount++;
            }
          } catch (err) {
            console.warn(`Gagal mengunduh file ${key} dari R2:`, err);
          }
        })
      );
    }

    if (successCount === 0) {
      return NextResponse.json(
        { error: 'Gagal mengunduh isi file dari R2 Storage.' },
        { status: 500 }
      );
    }

    const zipArray = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const headers = new Headers();
    headers.set('Content-Type', 'application/zip');
    headers.set('Content-Disposition', `attachment; filename="rekap_foto_${Date.now()}.zip"`);
    headers.set('Content-Length', zipArray.byteLength.toString());

    return new NextResponse(zipArray as unknown as BodyInit, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Download ZIP error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Gagal membuat file ZIP dari R2 Storage.',
      },
      { status: 500 }
    );
  }
}
