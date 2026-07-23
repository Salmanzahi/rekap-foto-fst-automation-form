// ============================================
// CONFIGURATION — Rekap Foto FST (v2)
// ============================================

// Google Apps Script Web App URL
export const APPS_SCRIPT_URL =
  process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbzWLv3hJkWPnzGLHeDld6CY4_M-LtuZ_eH0Y49Fm5BpRdts6uE-OniU-8OXl4fifii8jQ/exec'
// Event / kegiatan info
export const EVENT_INFO = {
  title: 'Rekap Foto FST',
  subtitle: 'Formulir Data Peserta',
  description: 'Silakan cari nama kamu, lalu lengkapi data yang diminta.',
  organization: 'FST',
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
  {
    name: 'Apakah sudah Foto Bareng',
    label: 'Apakah sudah Foto Bareng?',
    type: 'toggle',
    required: false,
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
