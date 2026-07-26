'use client';

import { OWNER_INFO } from '../lib/config';

interface SuccessScreenProps {
  name: string;
  submittedData: Record<string, string>;
  photoUrls: string[];
  existingPhotoUrls?: string[];
  onReset: () => void;
  isUpdateMode?: boolean;
}

function formatWaPhone(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('+62')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('08')) {
    cleaned = '62' + cleaned.substring(1);
  }
  return cleaned;
}

function buildWaMessage(
  name: string,
  submittedData: Record<string, string>,
  photoUrls: string[]
): string {
  let msg = `*REKAP DATA PESERTA FST*\n`;
  msg += `-----------------------------------\n\n`;

  // DATA 1: BIODATA RESPONDEN
  msg += `*DATA 1: BIODATA RESPONDEN*\n`;
  msg += `• Nama: ${name}\n`;
  if (submittedData['Prodi']) msg += `• Prodi: ${submittedData['Prodi']}\n`;
  if (submittedData['Kelompok']) msg += `• Kelompok: ${submittedData['Kelompok']}\n`;
  if (submittedData['No. Telp kamu'] || submittedData['No. Telp']) {
    msg += `• No. HP: ${submittedData['No. Telp kamu'] || submittedData['No. Telp']}\n`;
  }
  if (submittedData['Asal Daerah']) msg += `• Asal Daerah: ${submittedData['Asal Daerah']}\n`;
  if (submittedData['Sosmed']) msg += `• Sosmed: ${submittedData['Sosmed']}\n`;
  if (submittedData['Motto']) msg += `• Motto: "${submittedData['Motto']}"\n`;

  if (photoUrls && photoUrls.length > 0) {
    msg += `\nLink Foto Upload (${photoUrls.length}):\n`;
    photoUrls.forEach((url, i) => {
      msg += `${i + 1}. ${url}\n`;
    });
  }

  msg += `\n-----------------------------------\n\n`;

  // DATA 2: BIODATA OWNER (CREATOR)
  msg += `*DATA 2: BIODATA OWNER (CREATOR)*\n`;
  msg += `• Nama: ${OWNER_INFO.name}\n`;
  msg += `• Prodi: ${OWNER_INFO.prodi}\n`;
  msg += `• Kelompok: ${OWNER_INFO.kelompok}\n`;
  msg += `• Asal Daerah: ${OWNER_INFO.asalDaerah}\n`;
  if (OWNER_INFO.instagram) msg += `• IG: ${OWNER_INFO.instagram}\n`;
  msg += `• Motto: "${OWNER_INFO.motto}"\n`;

  msg += `\n-----------------------------------\n`;
  msg += `_Dikirim dari Integrated Biography Collector_`;
  return msg;
}

export default function SuccessScreen({
  name,
  submittedData,
  photoUrls,
  existingPhotoUrls = [],
  onReset,
  isUpdateMode,
}: SuccessScreenProps) {
  // Combine all photos uniquely
  const allDisplayPhotos = Array.from(
    new Set([...(photoUrls || []), ...(existingPhotoUrls || [])])
  );
  const waMessage = buildWaMessage(name, submittedData, allDisplayPhotos);
  const encodedMsg = encodeURIComponent(waMessage);

  // Phone formatting
  const respondentPhone =
    submittedData['No. Telp kamu'] || submittedData['No. Telp'] || '';
  const formattedRespondentPhone = formatWaPhone(respondentPhone);
  const waRespondentUrl = formattedRespondentPhone
    ? `https://wa.me/${formattedRespondentPhone}?text=${encodedMsg}`
    : `https://api.whatsapp.com/send?text=${encodedMsg}`;

  const formattedOwnerPhone = formatWaPhone(OWNER_INFO.phone);
  const waOwnerUrl = formattedOwnerPhone
    ? `https://wa.me/${formattedOwnerPhone}?text=${encodedMsg}`
    : `https://api.whatsapp.com/send?text=${encodedMsg}`;

  return (
    <div className="sc-root fade-in">
      {/* Status Header */}
      <div className="sc-header">
        <div className="sc-badge">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            width="20"
            height="20"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="sc-title">
          {isUpdateMode ? 'Data Berhasil Diperbarui' : 'Data Berhasil Tersimpan'}
        </h2>
        <p className="sc-desc">
          Terima kasih, <strong>{name}</strong>. Data kamu telah tercatat pada rekap data FST.
        </p>
      </div>

      {/* Summary Box */}
      <div className="sc-summary">
        <div className="sc-summary-head">
          <span>Ringkasan Data</span>
        </div>
        <div className="sc-summary-body">
          <div className="sc-row">
            <span className="sc-label">Nama Lengkap</span>
            <span className="sc-val">{name}</span>
          </div>
          {Object.entries(submittedData)
            .filter(
              ([key, value]) =>
                value && value !== 'FALSE' && key !== 'Upload Foto Bareng'
            )
            .map(([key, value]) => (
              <div key={key} className="sc-row">
                <span className="sc-label">{key}</span>
                <span className="sc-val">
                  {value === 'TRUE' ? 'Sudah Foto' : value}
                </span>
              </div>
            ))}
          {allDisplayPhotos.length > 0 && (
            <div className="sc-row">
              <span className="sc-label">Status Foto Bareng</span>
              <span className="sc-val">{allDisplayPhotos.length} foto terunggah</span>
            </div>
          )}
        </div>
      </div>

      {/* Photo History Gallery Section */}
      {allDisplayPhotos.length > 0 && (
        <div className="sc-photo-history-card fade-in">
          <div className="sc-photo-history-head">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="18"
              height="18"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
            <span>Histori Foto Bareng ({allDisplayPhotos.length} foto)</span>
          </div>
          <div className="sc-photo-history-grid">
            {allDisplayPhotos.map((url, i) => {
              const isNew = photoUrls.includes(url);
              return (
                <div key={`hist-photo-${i}`} className="sc-photo-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Foto ${i + 1}`}
                    className="sc-photo-thumbnail"
                  />
                  <div className="sc-photo-item-info">
                    <span
                      className={`sc-photo-tag ${isNew ? 'new' : 'existing'}`}
                    >
                      {isNew ? 'Baru' : 'Terunggah'}
                    </span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sc-photo-link"
                    >
                      Lihat Foto ↗
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WhatsApp Share Actions */}
      <div className="sc-wa">
        <span className="sc-wa-label">Kirim Ringkasan Data via WhatsApp</span>
        <div className="sc-wa-actions">
          <a
            href={waOwnerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="sc-wa-btn sc-wa-btn--owner"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="18"
              height="18"
            >
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
            <span>Kirim WA ke Owner</span>
          </a>

          <a
            href={waRespondentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="sc-wa-btn sc-wa-btn--self"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="18"
              height="18"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v8M8 12h8" />
            </svg>
            <span>Kirim WA ke Diri Sendiri</span>
          </a>
        </div>
      </div>

      {/* Creator Info Card */}
      <div className="sc-creator">
        <div className="sc-creator-head">
          <span className="sc-creator-tag">Penyelenggara / Owner</span>
          <span className="sc-creator-name">{OWNER_INFO.name}</span>
        </div>
        <div className="sc-creator-details">
          <span>{OWNER_INFO.prodi}</span>
          <span className="sc-dot">•</span>
          <span>Kelompok {OWNER_INFO.kelompok}</span>
          <span className="sc-dot">•</span>
          <span>{OWNER_INFO.asalDaerah}</span>
          {OWNER_INFO.instagram && (
            <>
              <span className="sc-dot">•</span>
              <a
                href={`https://instagram.com/${OWNER_INFO.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="sc-creator-ig"
              >
                IG: {OWNER_INFO.instagram} ↗
              </a>
            </>
          )}
        </div>
        <div className="sc-creator-motto">
          &ldquo;{OWNER_INFO.motto}&rdquo;
        </div>
      </div>

      {/* Reset Button */}
      <button type="button" className="sc-btn-reset" onClick={onReset}>
        Isi Data Peserta Lain →
      </button>
    </div>
  );
}
