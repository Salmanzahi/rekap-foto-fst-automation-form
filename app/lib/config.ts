// ============================================
// CONFIGURATION — Rekap Foto FST (v2)
// ============================================

// Google Apps Script Web App URL
export const APPS_SCRIPT_URL =
  process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbz1Ur6OMXG9tUUk5ZQqUCZv7hgYF5adxc117sCtEu90Oc54GH3rRrfoAo0l6mCOuaE4yQ/exec'
// Event / kegiatan info
export const EVENT_INFO = {
  title: 'Integrated Biography Collector',
  subtitle: 'Formulir Data Peserta',
  description: 'Silakan ketik / cari nama kamu, lalu lengkapi data yang diminta. Note: Data yang diambil berasal dari spreadsheet FST yang kamu isi di grup',
  organization: 'salmanzahi',
};

// Owner / Creator Info
export const OWNER_INFO = {
  name: 'Salman Zahi Muhajirin',
  prodi: 'Sistem Informasi',
  kelompok: '32',
  asalDaerah: 'Surabaya',
  motto: 'F = ma',
  phone: process.env.NEXT_PUBLIC_OWNER_WA || '089509542780',
  instagram: '@salmanzahi1104',
};

// ============================================
// Master Spreadsheet columns mapping
// ============================================
export interface MasterParticipant {
  'NAMA LENGKAP': string;
  'NIM': string;
  'PRODI': string;
  'ASAL DAERAH': string;
  'MOTTO': string;
  'INSTAGRAM': string;
  'KELOMPOK': string;
  [key: string]: string; // allow additional columns
}

// Mapping: Master column → Response column
// Master data will be pre-filled into the form using this mapping
export const MASTER_TO_RESPONSE_MAP: Record<string, string> = {
  'PRODI': 'Prodi',
  'ASAL DAERAH': 'Asal Daerah',
  'MOTTO': 'Motto',
  'INSTAGRAM': 'Sosmed',
  'KELOMPOK': 'Kelompok',
};

// ============================================
// Form field definitions for Response Spreadsheet
// ============================================
export interface FormField {
  name: string;        // Column name in Response spreadsheet
  label: string;       // Label shown in UI
  type: 'text' | 'tel' | 'email' | 'select' | 'textarea' | 'toggle';
  required: boolean;
  placeholder?: string;
  options?: string[];
  pattern?: string;
  helperText?: string;
  prefillFromMaster?: string;  // Master column to pre-fill from
  readOnlyWhenPrefilled?: boolean; // Lock field when pre-filled
}

export const FORM_FIELDS: FormField[] = [
  {
    name: 'No. Telp kamu',
    label: 'Nomor HP / WhatsApp',
    type: 'tel',
    required: true,
    placeholder: '08xxxxxxxxxx',
    pattern: '^(08|\\+62)[0-9]{8,13}$',
    helperText: 'Format: 08xxxxxxxxxx atau +62xxxxxxxxxx',
  },
  {
    name: 'Prodi',
    label: 'Program Studi',
    type: 'text',
    required: true,
    placeholder: 'Masukkan program studi...',
    prefillFromMaster: 'PRODI',
  },
  {
    name: 'Kelompok',
    label: 'Kelompok',
    type: 'text',
    required: true,
    placeholder: 'Nomor kelompok...',
    prefillFromMaster: 'KELOMPOK',
  },
  {
    name: 'Asal Daerah',
    label: 'Asal Daerah',
    type: 'text',
    required: true,
    placeholder: 'Kota / Kabupaten asal...',
    prefillFromMaster: 'ASAL DAERAH',
  },
  {
    name: 'Sosmed',
    label: 'Instagram / Sosial Media',
    type: 'text',
    required: false,
    placeholder: '@username',
    prefillFromMaster: 'INSTAGRAM',
  },
  {
    name: 'Motto',
    label: 'Motto',
    type: 'text',
    required: false,
    placeholder: 'Motto hidup kamu...',
    prefillFromMaster: 'MOTTO',
  },
];

// ============================================
// Photo upload config
// ============================================
export const UPLOAD_CONFIG = {
  maxFiles: 5,
  maxSizeMB: 10,
  acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  acceptedExtensions: '.jpg,.jpeg,.png,.webp',
};

// ============================================
// Form Admission Capacity Config & Status
// ============================================
export const CAPACITY_CONFIG = {
  targetTotal: 80,
  targetPerProdi: 10,
  warningThresholdRatio: 0.8, // 80% capacity triggers warning status (8/10 per prodi, 64/80 total)
};

export interface CapacityStatus {
  count: number;          // foto bareng count
  submittedCount: number; // form booked / submitted count
  target: number;
  pct: number;
  isWarning: boolean;
  isFull: boolean;
}

export function getProdiCapacityInfo(
  prodiInput: string,
  stats: { prodiStats?: Record<string, { submitted: number; fotoBareng: number }> } | null
): CapacityStatus {
  const target = CAPACITY_CONFIG.targetPerProdi;
  let count = 0;
  let submittedCount = 0;

  if (prodiInput && stats?.prodiStats) {
    const cleanInput = prodiInput.trim().toUpperCase();
    Object.entries(stats.prodiStats).forEach(([key, val]) => {
      const cleanKey = key.trim().toUpperCase();
      if (cleanKey === cleanInput || cleanKey.includes(cleanInput) || cleanInput.includes(cleanKey)) {
        count += val.fotoBareng || 0;
        submittedCount += val.submitted || 0;
      }
    });
  }

  const pct = Math.min(100, Math.round((count / target) * 100));
  const isFull = count >= target;
  const isWarning = !isFull && count >= Math.floor(target * CAPACITY_CONFIG.warningThresholdRatio);

  return { count, submittedCount, target, pct, isWarning, isFull };
}

export function getTotalCapacityInfo(
  stats: { totalFotoBareng?: number; totalSubmissions?: number } | null
): CapacityStatus {
  const target = CAPACITY_CONFIG.targetTotal;
  const count = stats?.totalFotoBareng || 0;
  const submittedCount = stats?.totalSubmissions || 0;
  const pct = Math.min(100, Math.round((count / target) * 100));
  const isFull = count >= target;
  const isWarning = !isFull && count >= Math.floor(target * CAPACITY_CONFIG.warningThresholdRatio);

  return { count, submittedCount, target, pct, isWarning, isFull };
}

