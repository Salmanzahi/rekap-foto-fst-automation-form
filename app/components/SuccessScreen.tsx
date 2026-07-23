'use client';

interface SuccessScreenProps {
  name: string;
  submittedData: Record<string, string>;
  photoUrls: string[];
  onReset: () => void;
}

export default function SuccessScreen({
  name,
  submittedData,
  photoUrls,
  onReset,
}: SuccessScreenProps) {
  return (
    <div className="success-container">
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

      <h2 className="success-title">Data Berhasil Dikirim!</h2>
      <p className="success-subtitle">
        Terima kasih, <strong>{name}</strong>. Data kamu sudah tersimpan.
      </p>

      <div className="success-summary">
        <h4 className="summary-title">Ringkasan Data</h4>
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
              <dt>Foto</dt>
              <dd>{photoUrls.length} foto diupload ✓</dd>
            </div>
          )}
        </dl>
      </div>

      <button type="button" className="btn-reset" onClick={onReset}>
        Isi Data Peserta Lain
      </button>
    </div>
  );
}
