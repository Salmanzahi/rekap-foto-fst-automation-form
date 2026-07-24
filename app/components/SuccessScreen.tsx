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

  // Respondent phone number formatting
  const respondentPhone = submittedData['No. Telp kamu'] || submittedData['No. Telp'] || '';
  const formattedRespondentPhone = formatWaPhone(respondentPhone);
  const waRespondentUrl = formattedRespondentPhone
    ? `https://wa.me/${formattedRespondentPhone}?text=${encodedMsg}`
    : `https://api.whatsapp.com/send?text=${encodedMsg}`;

  // Owner phone number formatting
  const formattedOwnerPhone = formatWaPhone(OWNER_INFO.phone);
  const waOwnerUrl = formattedOwnerPhone
    ? `https://wa.me/${formattedOwnerPhone}?text=${encodedMsg}`
    : `https://api.whatsapp.com/send?text=${encodedMsg}`;

  return (
    <div className="success-container fade-in">
      <div className="success-icon-wrapper">
        <svg
          className="success-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>

      <h2 className="success-title">
        {isUpdateMode ? 'Data Berhasil Diperbarui!' : 'Data Berhasil Dikirim!'}
      </h2>
      <p className="success-subtitle">
        Terima kasih, <strong>{name}</strong>.{' '}
        {isUpdateMode
          ? 'Data kamu sudah diperbarui di spreadsheet.'
          : 'Data kamu sudah tersimpan.'}
      </p>

      {/* Ringkasan Data Responden */}
      <div className="success-summary">
        <h4 className="summary-title">Ringkasan Data Kamu</h4>
        <dl className="summary-list">
          <div className="summary-item">
            <dt>Nama</dt>
            <dd>{name}</dd>
          </div>
          {Object.entries(submittedData)
            .filter(([, value]) => value && value !== 'FALSE')
            .map(([key, value]) => (
              <div key={key} className="summary-item">
                <dt>{key}</dt>
                <dd>{value === 'TRUE' ? '✓ Ya' : value}</dd>
              </div>
            ))}
          {photoUrls.length > 0 && (
            <div className="summary-item">
              <dt>Foto Upload</dt>
              <dd>{photoUrls.length} foto tersimpan ✓</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Kirim Data ke WhatsApp Section */}
      <div className="wa-share-card">
        <div className="wa-share-header">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" className="wa-green-icon">
            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.32a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.23z" />
          </svg>
          <h4>Kirim / Simpan Data ke WhatsApp</h4>
        </div>
        <p className="wa-share-desc">
          Kamu bisa langsung mengirim ringkasan data biodata dan link foto ini via WhatsApp:
        </p>
        <div className="wa-button-group">
          {/* Option 1: Kirim ke WA Owner (Salman) */}
          <a
            href={waOwnerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-wa btn-wa-owner"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.32a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.23z" />
            </svg>
            <span>📱 Kirim Data WA ke Salman (Owner)</span>
          </a>

          {/* Option 2: Kirim ke WA Responden */}
          <a
            href={waRespondentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-wa btn-wa-respondent"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.32a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.23z" />
            </svg>
            <span>💬 Kirim Data WA ke {name} (diriku sendiri)</span>
          </a>
        </div>
      </div>

      {/* Creator / Owner Bio Section */}
      <div className="owner-bio-card">
        <div className="owner-bio-header">
          <div className="owner-avatar">👨‍💻</div>
          <div className="owner-title-group">
            <span className="owner-badge">Creator / Owner</span>
            <h4 className="owner-name">{OWNER_INFO.name}</h4>
          </div>
        </div>
        <div className="owner-bio-grid">
          <div className="owner-bio-item">
            <span className="bio-label">Nama</span>
            <span className="bio-value">{OWNER_INFO.name}</span>
          </div>
          <div className="owner-bio-item">
            <span className="bio-label">Prodi</span>
            <span className="bio-value">{OWNER_INFO.prodi}</span>
          </div>
          <div className="owner-bio-item">
            <span className="bio-label">Kelompok</span>
            <span className="bio-value">{OWNER_INFO.kelompok}</span>
          </div>
          <div className="owner-bio-item">
            <span className="bio-label">Asal Daerah</span>
            <span className="bio-value">{OWNER_INFO.asalDaerah}</span>
          </div>
          <div className="owner-bio-item full-width">
            <span className="bio-label">Motto</span>
            <span className="bio-value motto">&quot;{OWNER_INFO.motto}&quot;</span>
          </div>
        </div>
      </div>

      <button type="button" className="btn-reset" onClick={onReset}>
        Isi Data Peserta Lain
      </button>
    </div>
  );
}
