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
  action: 'submit' | 'update';
  name: string;
  fields: Record<string, string>;
  photos?: PhotoData[];
  rowIndex?: number;
}

export interface SubmitResponse {
  success: boolean;
  message: string;
  photoUrls?: string[];
}

export interface CheckSubmissionResponse {
  submitted: boolean;
}

export interface ExistingSubmissionResponse {
  submitted: boolean;
  data?: Record<string, string>;
  rowIndex?: number;
}

export interface ResponseNamesResponse {
  names: string[];
}

export interface ProdiStatItem {
  submitted: number;
  fotoBareng: number;
}

export interface StatsResponse {
  totalSubmissions: number;
  totalFotoBareng: number;
  prodiStats: Record<string, ProdiStatItem>;
}

export interface ResponseItem {
  rowNumber: number;
  timestamp: string;
  phone: string;
  name: string;
  prodi: string;
  kelompok: string;
  asalDaerah: string;
  sosmed: string;
  motto: string;
  fotoBareng: boolean;
  photoUrls: string[];
}

export interface AllResponsesResponse {
  responses: ResponseItem[];
  total: number;
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
 * Fetch existing submission data for a participant from the Response spreadsheet.
 * Returns the existing row data + row index if found, or { submitted: false } if not.
 */
export async function fetchExistingSubmission(name: string): Promise<ExistingSubmissionResponse> {
  const response = await fetch(`/api/participants?action=getSubmission&name=${encodeURIComponent(name)}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    // If the backend doesn't support this action yet, treat as not submitted
    const errData = await response.json().catch(() => null);
    console.warn('fetchExistingSubmission error:', errData?.error);
    return { submitted: false };
  }

  const data: ExistingSubmissionResponse | ApiError = await response.json();

  if ('error' in data) {
    console.warn('fetchExistingSubmission error:', data.error);
    return { submitted: false };
  }

  return data;
}

/**
 * Fetch all names from the Response spreadsheet.
 * Used for autocomplete in manual name entry.
 */
export async function fetchResponseNames(): Promise<string[]> {
  const response = await fetch('/api/participants?action=getResponseNames', {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    console.warn('fetchResponseNames failed');
    return [];
  }

  const data: ResponseNamesResponse | ApiError = await response.json();

  if ('error' in data) {
    console.warn('fetchResponseNames error:', data.error);
    return [];
  }

  return data.names || [];
}

/**
 * Fetch statistics data (total submitted, total foto bareng, per prodi stats) from backend.
 */
export async function fetchStats(): Promise<StatsResponse | null> {
  try {
    const response = await fetch('/api/participants?action=getStats', {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn('fetchStats failed');
      return null;
    }

    const data: StatsResponse | ApiError = await response.json();

    if ('error' in data) {
      console.warn('fetchStats error:', data.error);
      return null;
    }

    return data;
  } catch (err) {
    console.warn('fetchStats exception:', err);
    return null;
  }
}

/**
 * Fetch all submitted responses for Admin Analytics dashboard.
 */
export async function fetchAllResponses(): Promise<ResponseItem[]> {
  try {
    const response = await fetch('/api/participants?action=getAllResponses', {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn('fetchAllResponses failed');
      return [];
    }

    const data: AllResponsesResponse | ApiError = await response.json();

    if ('error' in data) {
      console.warn('fetchAllResponses error:', data.error);
      return [];
    }

    return data.responses || [];
  } catch (err) {
    console.warn('fetchAllResponses exception:', err);
    return [];
  }
}

/**
 * Delete a participant response and their associated photo files from R2 storage.
 */
export async function deleteResponseData(
  name: string,
  rowIndex: number,
  photoUrls: string[] = []
): Promise<{ success: boolean; message: string }> {
  const response = await fetch('/api/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, rowIndex, photoUrls }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(
      errData?.error || `Gagal menghapus data (HTTP ${response.status})`
    );
  }

  return response.json();
}

/**
 * Submit participant data + photos via local Next.js API proxy (/api/submit).
 * When rowIndex is provided, sends an 'update' action to update an existing row.
 */
export async function submitData(
  name: string,
  fields: Record<string, string>,
  photos?: PhotoData[],
  rowIndex?: number
): Promise<SubmitResponse> {
  const isUpdate = rowIndex !== undefined && rowIndex !== null;

  const payload: SubmitDataPayload = {
    action: isUpdate ? 'update' : 'submit',
    name,
    fields,
    photos,
    ...(isUpdate ? { rowIndex } : {}),
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

/**
 * Download photos from R2 storage as a ZIP file.
 * If photoUrls array is provided, only downloads those specific photos. Otherwise downloads all.
 */
export async function downloadAllPhotosZip(photoUrls?: string[]): Promise<Blob> {
  const isSelected = photoUrls && photoUrls.length > 0;
  const response = await fetch('/api/download-zip', {
    method: isSelected ? 'POST' : 'GET',
    headers: isSelected ? { 'Content-Type': 'application/json' } : undefined,
    body: isSelected ? JSON.stringify({ photoUrls }) : undefined,
    cache: 'no-store',
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(
      errData?.error || `Gagal mengunduh file ZIP (HTTP ${response.status})`
    );
  }

  return response.blob();
}

