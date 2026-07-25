import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// R2 Configuration from environment variables
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
const R2_PUBLIC_DOMAIN =
  process.env.R2_PUBLIC_DOMAIN ||
  process.env.R2_PUBLIC_URL ||
  process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN ||
  '';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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

/**
 * Sanitizes folder and file names:
 * Replaces invalid characters AND spaces with an underscore (_).
 * E.g. "SISTEM INFORMASI" -> "SISTEM_INFORMASI"
 */
function cleanString(str: string): string {
  return str
    .trim()
    .replace(/[\/\\:*?"<>|\s]+/g, '_');
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const rawProdi = (formData.get('prodi') as string) || 'Lainnya';
    const rawKelompok = (formData.get('kelompok') as string) || '-';
    const rawName = (formData.get('name') as string) || 'Peserta';

    const prodi = cleanString(rawProdi);
    const kelompok = cleanString(rawKelompok);
    const name = cleanString(rawName);

    // Validations
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada file yang diupload' },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maksimal ${MAX_FILES} file per upload` },
        { status: 400 }
      );
    }

    // Validate each file
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Format file "${file.name}" tidak didukung. Gunakan JPEG, PNG, atau WebP.` },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" terlalu besar (${(file.size / 1024 / 1024).toFixed(1)}MB). Maksimal 10MB.` },
          { status: 400 }
        );
      }
    }

    const s3Client = getS3Client();
    const uploadedUrls: string[] = [];
    const publicDomainBase = R2_PUBLIC_DOMAIN.replace(/\/$/, '');

    // Upload each file with structured folder/filename
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      
      // Structure: rekap-foto/[Prodi_Folder]/Kel-[Kelompok]_[Nama]_[Index].[ext]
      const key = `rekap-foto/${prodi}/Kel-${kelompok}_${name}_${i + 1}.${ext}`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: key,
          Body: buffer,
          ContentType: file.type,
        })
      );

      // Construct public URL using custom domain from .env.local
      const publicUrl = publicDomainBase
        ? `${publicDomainBase}/${key}`
        : `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;

      uploadedUrls.push(publicUrl);
    }

    return NextResponse.json({
      success: true,
      message: `${files.length} foto berhasil diupload ke R2 Storage`,
      urls: uploadedUrls,
    });
  } catch (error) {
    console.error('R2 Upload error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Gagal mengupload foto ke R2 Storage.',
      },
      { status: 500 }
    );
  }
}
