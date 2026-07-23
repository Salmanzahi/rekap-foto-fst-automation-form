import type { MasterParticipant } from './config';

// ============================================
// API Functions v4 — Next.js Local Proxy (Bypass CORS)
// ============================================

export interface MasterParticipantResponse {
  participants: MasterParticipant[];
  headers: string[];
  total: number;
}

export interface PhotoData {
  fileName: string;
  mimeType: string;
  base64: string;
}

export interface SubmitDataPayload {
  action: 'submit';
  name: string;
  fields: Record<string, string>;
  photos?: PhotoData[];
}

export interface SubmitResponse {
  success: boolean;
  message: string;
  photoUrls?: string[];
}

export interface CheckSubmissionResponse {
  submitted: boolean;
}

export interface ApiError {
  error: string;
}

/**
 * Fetch all participants via local Next.js API proxy (/api/participants).
 * Bypasses all browser CORS issues!
 */
export async function fetchParticipants(): Promise<MasterParticipant[]> {
  const response = await fetch('/api/participants', {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(
      errData?.error || `Gagal mengambil data peserta (HTTP ${response.status})`
    );
  }

  const data: MasterParticipantResponse | ApiError = await response.json();

  if ('error' in data) {
    throw new Error(data.error);
  }

  return data.participants || [];
}

/**
 * Check if a participant has already submitted their data.
 */
export async function checkSubmission(name: string): Promise<boolean> {
  const response = await fetch(`/api/participants?action=checkSubmission&name=${encodeURIComponent(name)}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Gagal mengecek data (HTTP ${response.status})`);
  }

  const data: CheckSubmissionResponse | ApiError = await response.json();

  if ('error' in data) {
    throw new Error(data.error);
  }

  return data.submitted;
}

/**
 * Submit participant data + photos via local Next.js API proxy (/api/submit).
 */
export async function submitData(
  name: string,
  fields: Record<string, string>,
  photos?: PhotoData[]
): Promise<SubmitResponse> {
  const payload: SubmitDataPayload = {
    action: 'submit',
    name,
    fields,
    photos,
  };

  const response = await fetch('/api/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(
      errData?.error || `Gagal mengirim data (HTTP ${response.status})`
    );
  }

  const data: SubmitResponse | ApiError = await response.json();

  if ('error' in data) {
    throw new Error(data.error);
  }

  return data;
}

/**
 * Convert a browser File object to a Base64 string for Google Apps Script transmission.
 */
export function fileToPhotoData(file: File): Promise<PhotoData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Index = result.indexOf(';base64,');
      if (base64Index === -1) {
        reject(new Error('Format file tidak dapat dikonversi ke Base64'));
        return;
      }
      const base64 = result.substring(base64Index + 8);
      resolve({
        fileName: file.name,
        mimeType: file.type || 'image/jpeg',
        base64,
      });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
