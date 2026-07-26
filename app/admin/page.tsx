'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  fetchParticipants,
  fetchAllResponses,
  fetchStats,
  submitData,
  deleteResponseData,
  type ResponseItem,
  type StatsResponse,
} from '../lib/api';
import { EVENT_INFO, OWNER_INFO, type MasterParticipant } from '../lib/config';
import { DEFAULT_PRODI_LIST, normalizeProdi } from '../lib/prodi';

const TARGET_TOTAL = 80;
const TARGET_PER_PRODI = 10;

const PRODI_SHORT: Record<string, string> = {
  'SISTEM INFORMASI': 'Sisfor',
  'TEKNIK LINGKUNGAN': 'Tekling',
  'TEKNIK BIOMEDIS': 'Biomedis',
  'MATEMATIKA': 'Matematika',
  'FISIKA': 'Fisika',
  'KIMIA': 'Kimia',
  'BIOLOGI': 'Biologi',
  'STATISTIKA': 'Statistika',
};

/**
 * Normalizes phone numbers starting with 08, 8, 62, or +62 to international format (628...)
 */
function formatWaPhone(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (!cleaned) return '';

  if (cleaned.startsWith('08')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  } else if (cleaned.startsWith('628')) {
    // Already in 628... format
  } else if (cleaned.startsWith('62')) {
    // Already in 62... format
  }

  return cleaned;
}

function buildAdminWaMsg(r: ResponseItem): string {
  let msg = `*REKAP DATA PESERTA FST*\n`;
  msg += `-----------------------------------\n\n`;

  // DATA 1: BIODATA RESPONDEN
  msg += `📌 *DATA 1: BIODATA RESPONDEN*\n`;
  msg += `👤 *Nama:* ${r.name}\n`;
  if (r.prodi) msg += `📚 *Prodi:* ${r.prodi}\n`;
  if (r.kelompok) msg += `👥 *Kelompok:* ${r.kelompok}\n`;
  if (r.phone) msg += `📞 *No. HP:* ${r.phone}\n`;
  if (r.asalDaerah) msg += `🏠 *Asal Daerah:* ${r.asalDaerah}\n`;
  if (r.sosmed) msg += `📱 *Sosmed:* ${r.sosmed}\n`;
  if (r.motto) msg += `💬 *Motto:* "${r.motto}"\n`;

  if (r.photoUrls && r.photoUrls.length > 0) {
    msg += `\n🖼️ *Link Foto Upload (${r.photoUrls.length}):*\n`;
    r.photoUrls.forEach((url, i) => {
      msg += `${i + 1}. ${url}\n`;
    });
  }

  msg += `\n-----------------------------------\n\n`;

  // DATA 2: BIODATA OWNER (CREATOR)
  msg += `👨‍💻 *DATA 2: BIODATA OWNER (CREATOR)*\n`;
  msg += `👤 *Nama:* ${OWNER_INFO.name}\n`;
  msg += `📚 *Prodi:* ${OWNER_INFO.prodi}\n`;
  msg += `👥 *Kelompok:* ${OWNER_INFO.kelompok}\n`;
  msg += `🏠 *Asal Daerah:* ${OWNER_INFO.asalDaerah}\n`;
  if (OWNER_INFO.instagram) msg += `📱 *IG:* ${OWNER_INFO.instagram}\n`;
  msg += `💬 *Motto:* "${OWNER_INFO.motto}"\n`;

  msg += `\n-----------------------------------\n`;
  msg += `_Dikirim via Admin Analytics_`;
  return msg;
}

export default function AdminAnalyticsPage() {
  const [participants, setParticipants] = useState<MasterParticipant[]>([]);
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status Notice Toast
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProdi, setFilterProdi] = useState('ALL');
  const [filterFoto, setFilterFoto] = useState('ALL');

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<ResponseItem | null>(null);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Modal State
  const [deletingItem, setDeletingItem] = useState<ResponseItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [partsData, respData, statsData] = await Promise.all([
        fetchParticipants(),
        fetchAllResponses(),
        fetchStats(),
      ]);
      setParticipants(partsData);
      setResponses(respData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Show auto-dismiss notice
  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotice({ type, message });
    setTimeout(() => {
      setNotice(null);
    }, 4000);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: ResponseItem) => {
    setEditingItem(item);
    setEditFields({
      name: item.name,
      'No. Telp kamu': item.phone || '',
      Prodi: normalizeProdi(item.prodi),
      Kelompok: item.kelompok || '',
      'Asal Daerah': item.asalDaerah || '',
      Sosmed: item.sosmed || '',
      Motto: item.motto || '',
      'Apakah sudah Foto Bareng': item.fotoBareng ? 'TRUE' : 'FALSE',
    });
  };

  // Submit Edit
  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsSavingEdit(true);
    try {
      await submitData(
        editingItem.name,
        editFields,
        undefined,
        editingItem.rowNumber
      );
      showNotice('success', `Data responden ${editingItem.name} berhasil diperbarui.`);
      setEditingItem(null);
      await loadData();
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Gagal memperbarui data.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (item: ResponseItem) => {
    setDeletingItem(item);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      await deleteResponseData(
        deletingItem.name,
        deletingItem.rowNumber,
        deletingItem.photoUrls
      );
      showNotice(
        'success',
        `Data responden "${deletingItem.name}" dan ${deletingItem.photoUrls.length} foto berhasil dihapus.`
      );
      setDeletingItem(null);
      await loadData();
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Gagal menghapus data.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Summary computations
  const totalSubmissions = responses.length;
  const totalFotoBareng = useMemo(
    () => responses.filter((r) => r.fotoBareng || r.photoUrls.length > 0).length,
    [responses]
  );
  const totalPhotosUploaded = useMemo(
    () => responses.reduce((acc, r) => acc + r.photoUrls.length, 0),
    [responses]
  );
  const sisaTargetTotal = Math.max(0, TARGET_TOTAL - totalFotoBareng);
  const overallPercentage = Math.min(100, Math.round((totalFotoBareng / TARGET_TOTAL) * 100));

  // Per prodi computations
  const prodiStatsList = useMemo(() => {
    return DEFAULT_PRODI_LIST.map((prodi) => {
      const prodiResponses = responses.filter(
        (r) => normalizeProdi(r.prodi) === prodi
      );
      const fotoCount = prodiResponses.filter(
        (r) => r.fotoBareng || r.photoUrls.length > 0
      ).length;
      const pct = Math.min(100, Math.round((fotoCount / TARGET_PER_PRODI) * 100));
      const reached = fotoCount >= TARGET_PER_PRODI;

      return {
        name: prodi,
        shortName: PRODI_SHORT[prodi] || prodi,
        submitted: prodiResponses.length,
        fotoCount,
        pct,
        reached,
      };
    });
  }, [responses]);

  const prodiReachedCount = useMemo(
    () => prodiStatsList.filter((p) => p.reached).length,
    [prodiStatsList]
  );

  // Demographics: Top Kelompok
  const kelompokStats = useMemo(() => {
    const map: Record<string, number> = {};
    responses.forEach((r) => {
      const k = r.kelompok ? `Kelompok ${r.kelompok}` : 'Belum diisi';
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [responses]);

  // Demographics: Top Asal Daerah
  const daerahStats = useMemo(() => {
    const map: Record<string, number> = {};
    responses.forEach((r) => {
      const d = r.asalDaerah?.trim().toUpperCase() || 'BELUM DIISI';
      map[d] = (map[d] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [responses]);

  // Filtered responses for data table
  const filteredResponses = useMemo(() => {
    return responses.filter((r) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = r.name.toLowerCase().includes(q);
        const matchProdi = r.prodi.toLowerCase().includes(q);
        const matchKelompok = r.kelompok.toLowerCase().includes(q);
        const matchPhone = r.phone.includes(q);
        if (!matchName && !matchProdi && !matchKelompok && !matchPhone) return false;
      }
      // Prodi filter
      if (filterProdi !== 'ALL') {
        if (normalizeProdi(r.prodi) !== filterProdi) return false;
      }
      // Foto filter
      if (filterFoto === 'YES' && !r.fotoBareng && r.photoUrls.length === 0) return false;
      if (filterFoto === 'NO' && (r.fotoBareng || r.photoUrls.length > 0)) return false;

      return true;
    });
  }, [responses, searchQuery, filterProdi, filterFoto]);

  // Export CSV helper
  const handleExportCSV = () => {
    if (responses.length === 0) return;
    const headers = [
      'No',
      'Timestamp',
      'Nama Peserta',
      'Prodi',
      'Kelompok',
      'No. HP',
      'Asal Daerah',
      'Sosmed',
      'Motto',
      'Status Foto',
      'URL Foto',
    ];
    const rows = responses.map((r, i) => [
      i + 1,
      `"${r.timestamp}"`,
      `"${r.name}"`,
      `"${r.prodi}"`,
      `"${r.kelompok}"`,
      `"${r.phone}"`,
      `"${r.asalDaerah}"`,
      `"${r.sosmed}"`,
      `"${r.motto}"`,
      r.fotoBareng || r.photoUrls.length > 0 ? 'Sudah Foto' : 'Belum Foto',
      `"${r.photoUrls.join(' | ')}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_foto_fst_analytics_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="adm-container">
      {/* Toast Notification */}
      {notice && (
        <div className={`adm-toast adm-toast--${notice.type} fade-in`}>
          <span>{notice.message}</span>
        </div>
      )}

      {/* Navbar Header */}
      <header className="adm-header">
        <div className="adm-header-left">
          <Link href="/" className="adm-back-link">
            &larr; Formulir Responden
          </Link>
          <h1 className="adm-title">Analytics Dashboard</h1>
          <span className="adm-subtitle">{EVENT_INFO.title} &bull; Form Analytics</span>
        </div>
        <div className="adm-header-right">
          <button
            type="button"
            className="adm-btn adm-btn-secondary"
            onClick={loadData}
            disabled={isLoading}
          >
            {isLoading ? 'Memuat...' : '🔄 Refresh Data'}
          </button>
          <button
            type="button"
            className="adm-btn adm-btn-primary"
            onClick={handleExportCSV}
            disabled={responses.length === 0}
          >
            📥 Export CSV
          </button>
        </div>
      </header>

      {error && (
        <div className="adm-alert adm-alert-error">
          <span>⚠️ {error}</span>
          <button type="button" onClick={loadData} className="adm-alert-btn">
            Coba Lagi
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="adm-kpi-grid">
        <div className="adm-kpi-card">
          <span className="adm-kpi-label">Total Responden</span>
          <div className="adm-kpi-val">{totalSubmissions}</div>
          <span className="adm-kpi-sub">
            {participants.length > 0
              ? `${Math.round((totalSubmissions / participants.length) * 100)}% dari ${participants.length} master`
              : 'Data terkumpul'}
          </span>
        </div>

        <div className="adm-kpi-card adm-kpi-card--accent">
          <span className="adm-kpi-label">Sudah Foto Bareng</span>
          <div className="adm-kpi-val">
            {totalFotoBareng} <span className="adm-kpi-denom">/ {TARGET_TOTAL}</span>
          </div>
          <div className="adm-progress-track">
            <div
              className="adm-progress-fill"
              style={{ width: `${overallPercentage}%` }}
            />
          </div>
          <span className="adm-kpi-sub">{overallPercentage}% target 80 terpenuhi</span>
        </div>

        <div className="adm-kpi-card">
          <span className="adm-kpi-label">Foto R2 Terunggah</span>
          <div className="adm-kpi-val">{totalPhotosUploaded}</div>
          <span className="adm-kpi-sub">File foto tersimpan di CDN Cloudflare</span>
        </div>

        <div className="adm-kpi-card">
          <span className="adm-kpi-label">Target Prodi Tercapai</span>
          <div className="adm-kpi-val">
            {prodiReachedCount} <span className="adm-kpi-denom">/ 8</span>
          </div>
          <span className="adm-kpi-sub">Target 10 anak / prodi</span>
        </div>
      </div>

      {/* Main Analytics Content Layout */}
      <div className="adm-sections-grid">
        {/* Left Column: Per-Prodi Analytics */}
        <section className="adm-card adm-card-prodi">
          <div className="adm-card-head">
            <h3>Progress Foto per Program Studi</h3>
            <span className="adm-card-tag">Target: 10 per prodi</span>
          </div>
          <div className="adm-prodi-list">
            {prodiStatsList.map((item) => (
              <div key={item.name} className="adm-prodi-item">
                <div className="adm-prodi-info">
                  <span className="adm-prodi-name">
                    {item.name}
                    {item.reached && <span className="adm-badge-check">✓ Target</span>}
                  </span>
                  <span className="adm-prodi-count">
                    {item.fotoCount} / 10 foto ({item.submitted} form)
                  </span>
                </div>
                <div className="adm-progress-track">
                  <div
                    className={`adm-progress-fill ${item.reached ? 'reached' : ''}`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right Column: Demographics & Group Distribution */}
        <div className="adm-right-col">
          {/* Top Kelompok */}
          <section className="adm-card">
            <div className="adm-card-head">
              <h3>Top Kelompok Submit</h3>
            </div>
            <div className="adm-list-compact">
              {kelompokStats.length > 0 ? (
                kelompokStats.map(([kel, cnt]) => (
                  <div key={kel} className="adm-list-row">
                    <span className="adm-list-key">{kel}</span>
                    <span className="adm-list-val">{cnt} responden</span>
                  </div>
                ))
              ) : (
                <span className="adm-empty-text">Belum ada data</span>
              )}
            </div>
          </section>

          {/* Demografi Asal Daerah */}
          <section className="adm-card">
            <div className="adm-card-head">
              <h3>Demografi Asal Daerah</h3>
            </div>
            <div className="adm-list-compact">
              {daerahStats.length > 0 ? (
                daerahStats.map(([city, cnt]) => (
                  <div key={city} className="adm-list-row">
                    <span className="adm-list-key">{city}</span>
                    <span className="adm-list-val">{cnt} peserta</span>
                  </div>
                ))
              ) : (
                <span className="adm-empty-text">Belum ada data</span>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Responses Data Table */}
      <section className="adm-card adm-card-table">
        <div className="adm-table-header">
          <div className="adm-table-title-group">
            <h3>Daftar Respon Masuk</h3>
            <span className="adm-table-count">
              Menampilkan {filteredResponses.length} dari {responses.length} respon
            </span>
          </div>

          {/* Table Controls / Filters */}
          <div className="adm-table-controls">
            <input
              type="text"
              placeholder="Cari nama, prodi, kelompok, no. hp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="adm-input-search"
            />
            <select
              value={filterProdi}
              onChange={(e) => setFilterProdi(e.target.value)}
              className="adm-select-filter"
            >
              <option value="ALL">Semua Prodi</option>
              {DEFAULT_PRODI_LIST.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={filterFoto}
              onChange={(e) => setFilterFoto(e.target.value)}
              className="adm-select-filter"
            >
              <option value="ALL">Semua Status Foto</option>
              <option value="YES">Sudah Foto Bareng</option>
              <option value="NO">Belum Foto Bareng</option>
            </select>
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="adm-table-wrapper">
          {isLoading ? (
            <div className="adm-loading-state">
              <span className="adm-spinner" />
              <span>Memuat data respon...</span>
            </div>
          ) : filteredResponses.length === 0 ? (
            <div className="adm-empty-state">
              <span>Tidak ada data respon yang cocok dengan filter</span>
            </div>
          ) : (
            <table className="adm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Timestamp</th>
                  <th>Nama Peserta</th>
                  <th>Prodi</th>
                  <th>Kel.</th>
                  <th>No. HP</th>
                  <th>Asal Daerah</th>
                  <th>Sosmed</th>
                  <th>Status Foto</th>
                  <th>Foto Upload</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredResponses.map((r, idx) => {
                  const hasFoto = r.fotoBareng || r.photoUrls.length > 0;
                  return (
                    <tr key={r.rowNumber || idx}>
                      <td className="cell-num">{idx + 1}</td>
                      <td className="cell-time">{r.timestamp ? r.timestamp.substring(0, 16) : '-'}</td>
                      <td className="cell-name">{r.name}</td>
                      <td className="cell-prodi">
                        <span className="adm-tag-prodi">{PRODI_SHORT[normalizeProdi(r.prodi)] || r.prodi}</span>
                      </td>
                      <td className="cell-kel">{r.kelompok || '-'}</td>
                      <td className="cell-phone">
                        {r.phone ? (
                          <div className="adm-phone-group">
                            <span className="adm-phone-num">{r.phone}</span>
                            {formatWaPhone(r.phone) ? (
                              <a
                                href={`https://wa.me/${formatWaPhone(r.phone)}?text=${encodeURIComponent(buildAdminWaMsg(r))}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="adm-btn-wa-chat"
                                title={`Chat WhatsApp ke ${r.name} (${formatWaPhone(r.phone)})`}
                              >
                                <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.32a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.23z" />
                                </svg>
                                <span>WA</span>
                              </a>
                            ) : null}
                          </div>
                        ) : (
                          <span className="adm-text-muted">-</span>
                        )}
                      </td>
                      <td className="cell-city">{r.asalDaerah || '-'}</td>
                      <td className="cell-sosmed">{r.sosmed || '-'}</td>
                      <td>
                        {hasFoto ? (
                          <span className="adm-status-badge success">✓ Sudah Foto</span>
                        ) : (
                          <span className="adm-status-badge pending">Belum Foto</span>
                        )}
                      </td>
                      <td className="cell-photos">
                        {r.photoUrls.length > 0 ? (
                          <div className="adm-photo-links">
                            {r.photoUrls.map((url, pIdx) => (
                              <a
                                key={url}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="adm-photo-link"
                              >
                                Foto #{pIdx + 1} &nearr;
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="adm-text-muted">-</span>
                        )}
                      </td>
                      <td className="cell-actions">
                        <div className="adm-action-buttons">
                          <button
                            type="button"
                            className="adm-action-btn adm-action-btn--edit"
                            onClick={() => handleOpenEdit(r)}
                            title="Edit Data Responden"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            className="adm-action-btn adm-action-btn--delete"
                            onClick={() => handleOpenDelete(r)}
                            title="Hapus Responden & Foto"
                          >
                            🗑️ Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Edit Modal Dialog */}
      {editingItem && (
        <div className="adm-modal-overlay fade-in">
          <div className="adm-modal">
            <div className="adm-modal-header">
              <h3>Edit Data Responden</h3>
              <button type="button" className="adm-modal-close" onClick={() => setEditingItem(null)}>
                ✕
              </button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-form-group">
                <label>Nama Peserta</label>
                <input
                  type="text"
                  value={editFields['name'] || ''}
                  onChange={(e) => setEditFields({ ...editFields, name: e.target.value })}
                  className="adm-input"
                />
              </div>

              <div className="adm-form-row">
                <div className="adm-form-group">
                  <label>Prodi</label>
                  <select
                    value={editFields['Prodi'] || ''}
                    onChange={(e) => setEditFields({ ...editFields, Prodi: e.target.value })}
                    className="adm-input"
                  >
                    {DEFAULT_PRODI_LIST.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="adm-form-group">
                  <label>Kelompok</label>
                  <input
                    type="text"
                    value={editFields['Kelompok'] || ''}
                    onChange={(e) => setEditFields({ ...editFields, Kelompok: e.target.value })}
                    className="adm-input"
                  />
                </div>
              </div>

              <div className="adm-form-row">
                <div className="adm-form-group">
                  <label>No. HP (Telp)</label>
                  <input
                    type="tel"
                    value={editFields['No. Telp kamu'] || ''}
                    onChange={(e) => setEditFields({ ...editFields, 'No. Telp kamu': e.target.value })}
                    className="adm-input"
                  />
                </div>

                <div className="adm-form-group">
                  <label>Asal Daerah</label>
                  <input
                    type="text"
                    value={editFields['Asal Daerah'] || ''}
                    onChange={(e) => setEditFields({ ...editFields, 'Asal Daerah': e.target.value })}
                    className="adm-input"
                  />
                </div>
              </div>

              <div className="adm-form-row">
                <div className="adm-form-group">
                  <label>Sosmed (Instagram/DLL)</label>
                  <input
                    type="text"
                    value={editFields['Sosmed'] || ''}
                    onChange={(e) => setEditFields({ ...editFields, Sosmed: e.target.value })}
                    className="adm-input"
                  />
                </div>

                <div className="adm-form-group">
                  <label>Status Foto Bareng</label>
                  <select
                    value={editFields['Apakah sudah Foto Bareng'] || 'FALSE'}
                    onChange={(e) =>
                      setEditFields({ ...editFields, 'Apakah sudah Foto Bareng': e.target.value })
                    }
                    className="adm-input"
                  >
                    <option value="TRUE">✓ Sudah Foto Bareng</option>
                    <option value="FALSE">Belum Foto Bareng</option>
                  </select>
                </div>
              </div>

              <div className="adm-form-group">
                <label>Motto</label>
                <textarea
                  value={editFields['Motto'] || ''}
                  onChange={(e) => setEditFields({ ...editFields, Motto: e.target.value })}
                  className="adm-input adm-textarea"
                  rows={2}
                />
              </div>
            </div>
            <div className="adm-modal-footer">
              <button
                type="button"
                className="adm-btn adm-btn-secondary"
                onClick={() => setEditingItem(null)}
                disabled={isSavingEdit}
              >
                Batal
              </button>
              <button
                type="button"
                className="adm-btn adm-btn-primary"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal Dialog */}
      {deletingItem && (
        <div className="adm-modal-overlay fade-in">
          <div className="adm-modal adm-modal--sm">
            <div className="adm-modal-header">
              <h3>Konfirmasi Hapus Responden</h3>
              <button type="button" className="adm-modal-close" onClick={() => setDeletingItem(null)}>
                ✕
              </button>
            </div>
            <div className="adm-modal-body">
              <p className="adm-delete-warning">
                Apakah Anda yakin ingin menghapus data responden <strong>{deletingItem.name}</strong>?
              </p>
              <div className="adm-delete-info-card">
                <div className="adm-delete-info-row">
                  <span>Prodi:</span>
                  <strong>{deletingItem.prodi}</strong>
                </div>
                <div className="adm-delete-info-row">
                  <span>Kelompok:</span>
                  <strong>{deletingItem.kelompok || '-'}</strong>
                </div>
                <div className="adm-delete-info-row">
                  <span>Foto Terunggah:</span>
                  <strong>
                    {deletingItem.photoUrls.length > 0
                      ? `${deletingItem.photoUrls.length} file di R2 Storage (akan terhapus)`
                      : 'Tidak ada foto'}
                  </strong>
                </div>
              </div>
              <span className="adm-delete-note">
                ⚠️ Tindakan ini akan menghapus baris dari Google Spreadsheet dan menghapus file foto dari Cloudflare R2 secara permanen.
              </span>
            </div>
            <div className="adm-modal-footer">
              <button
                type="button"
                className="adm-btn adm-btn-secondary"
                onClick={() => setDeletingItem(null)}
                disabled={isDeleting}
              >
                Batal
              </button>
              <button
                type="button"
                className="adm-btn adm-btn-danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Menghapus...' : '🗑️ Ya, Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
