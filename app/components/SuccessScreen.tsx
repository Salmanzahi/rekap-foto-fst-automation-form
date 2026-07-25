'use client';

import { OWNER_INFO } from '../lib/config';

interface SuccessScreenProps {
  name: string;
  submittedData: Record<string, string>;
  photoUrls: string[];
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
  msg += `-----------------------------------\n`;
  msg += `👤 *Nama:* ${name}\n`;
  if (submittedData['Prodi']) msg += `📚 *Prodi:* ${submittedData['Prodi']}\n`;
  if (submittedData['Kelompok']) msg += `👥 *Kelompok:* ${submittedData['Kelompok']}\n`;
  if (submittedData['No. Telp kamu']) msg += `📞 *No. HP:* ${submittedData['No. Telp kamu']}\n`;
  if (submittedData['Asal Daerah']) msg += `🏠 *Asal Daerah:* ${submittedData['Asal Daerah']}\n`;
  if (submittedData['Sosmed']) msg += `📱 *Sosmed:* ${submittedData['Sosmed']}\n`;
  if (submittedData['Motto']) msg += `💬 *Motto:* "${submittedData['Motto']}"\n`;

  if (photoUrls && photoUrls.length > 0) {
    msg += `\n🖼️ *Link Foto Upload (${photoUrls.length}):*\n`;
    photoUrls.forEach((url, i) => {
      msg += `${i + 1}. ${url}\n`;
    });
  }

  msg += `\n-----------------------------------\n`;
  msg += `_Dikirim dari Rekap Foto FST_`;
  return msg;
}

export default function SuccessScreen({
  name,
  submittedData,
  photoUrls,
  onReset,
  isUpdateMode,
}: SuccessScreenProps) {
  const waMessage = buildWaMessage(name, submittedData, photoUrls);
  const encodedMsg = encodeURIComponent(waMessage);

  // Phone formatting
  const respondentPhone = submittedData['No. Telp kamu'] || submittedData['No. Telp'] || '';
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="sc-title">
          {isUpdateMode ? 'Data Berhasil Diperbarui' : 'Data Berhasil Tersimpan'}
        </h2>
        <p className="sc-desc">
          Terima kasih, <strong>{name}</strong>. Data kamu sudah tercatat di rekap FST.
        </p>
      </div>

      {/* Summary Box */}
      <div className="sc-summary">
        <div className="sc-summary-head">
          <span>Ringkasan Formulir</span>
        </div>
        <div className="sc-summary-body">
          <div className="sc-row">
            <span className="sc-label">Nama</span>
            <span className="sc-val">{name}</span>
          </div>
          {Object.entries(submittedData)
            .filter(([, value]) => value && value !== 'FALSE')
            .map(([key, value]) => (
              <div key={key} className="sc-row">
                <span className="sc-label">{key}</span>
                <span className="sc-val">{value === 'TRUE' ? '✓ Ya' : value}</span>
              </div>
            ))}
          {photoUrls.length > 0 && (
            <div className="sc-row">
              <span className="sc-label">Foto Bareng</span>
              <span className="sc-val">{photoUrls.length} foto diunggah ✓</span>
            </div>
          )}
        </div>
      </div>

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
            <span>📱 Kirim WA ke Salman (Owner)</span>
          </a>

          <a
            href={waRespondentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="sc-wa-btn sc-wa-btn--self"
          >
            <span>💬 Kirim WA ke diri sendiri</span>
          </a>
        </div>
      </div>

      {/* Creator Info Card */}
      <div className="sc-creator">
        <div className="sc-creator-head">
          <span className="sc-creator-tag">Penyelenggara / Creator</span>
          <span className="sc-creator-name">{OWNER_INFO.name}</span>
        </div>
        <div className="sc-creator-details">
          <span>{OWNER_INFO.prodi}</span>
          <span className="sc-dot">•</span>
          <span>Kelompok {OWNER_INFO.kelompok}</span>
          <span className="sc-dot">•</span>
          <span>{OWNER_INFO.asalDaerah}</span>
        </div>
        <div className="sc-creator-motto">
          &ldquo;{OWNER_INFO.motto}&rdquo;
        </div>
      </div>

      {/* Reset Button */}
      <button type="button" className="sc-btn-reset" onClick={onReset}>
        Isi Data Peserta Lain &rarr;
      </button>
    </div>
  );
}
