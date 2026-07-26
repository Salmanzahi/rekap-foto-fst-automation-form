'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FORM_FIELDS, type FormField, type MasterParticipant, getProdiCapacityInfo, getTotalCapacityInfo } from '../lib/config';
import ProdiSelect from './ProdiSelect';
import { normalizeProdi } from '../lib/prodi';
import type { StatsResponse } from '../lib/api';

interface DataFormProps {
  selectedName: string;
  masterData: MasterParticipant | null; // null when user skipped (manual entry)
  onSubmit: (name: string, fields: Record<string, string>) => void;
  onBack: () => void;
  isSubmitting: boolean;
  isFromMaster: boolean;
  existingData?: Record<string, string> | null;
  isUpdateMode?: boolean;
  onCheckExisting?: (name: string) => void;
  isCheckingExisting?: boolean;
  responseNames?: string[];
  statsData?: StatsResponse | null;
}

function buildInitialFormData(
  masterData?: MasterParticipant | null,
  existingData?: Record<string, string> | null
): Record<string, string> {
  const initial: Record<string, string> = {};
  FORM_FIELDS.forEach((field) => {
    let val = '';
    // Priority: existingData > masterData > default
    if (existingData && existingData[field.name]) {
      val = existingData[field.name];
    } else if (field.prefillFromMaster && masterData && masterData[field.prefillFromMaster]) {
      val = masterData[field.prefillFromMaster];
    } else if (field.type === 'toggle') {
      val = 'FALSE';
    }

    if (field.name === 'Prodi' && val) {
      val = normalizeProdi(val);
    }
    initial[field.name] = val;
  });
  return initial;
}

export default function DataForm({
  selectedName,
  masterData,
  onSubmit,
  onBack,
  isSubmitting,
  isFromMaster,
  existingData,
  isUpdateMode,
  onCheckExisting,
  isCheckingExisting,
  responseNames,
  statsData,
}: DataFormProps) {
  const [prevProps, setPrevProps] = useState({ selectedName, masterData, existingData });
  const [formData, setFormData] = useState<Record<string, string>>(() =>
    buildInitialFormData(masterData, existingData)
  );
  const [name, setName] = useState(selectedName);
  const [nameQuery, setNameQuery] = useState(selectedName);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalCapInfo = getTotalCapacityInfo(statsData ?? null);
  const selectedProdiName = formData['Prodi'] || '';
  const prodiCapInfo = selectedProdiName ? getProdiCapacityInfo(selectedProdiName, statsData ?? null) : null;

  // Sync state during render when props change (eliminates useEffect setState cascading renders)
  if (
    prevProps.selectedName !== selectedName ||
    prevProps.masterData !== masterData ||
    prevProps.existingData !== existingData
  ) {
    setPrevProps({ selectedName, masterData, existingData });
    setFormData(buildInitialFormData(masterData, existingData));
    setName(selectedName);
    setNameQuery(selectedName);
  }

  // Autocomplete state for manual name entry
  const [filteredNames, setFilteredNames] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [lastCheckedName, setLastCheckedName] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameContainerRef = useRef<HTMLDivElement>(null);
  const nameListRef = useRef<HTMLUListElement>(null);

  const validateField = (field: FormField, value: string): string | null => {
    if (field.required && !value.trim()) {
      return `${field.label} wajib diisi`;
    }

    if (value.trim() && field.pattern) {
      const regex = new RegExp(field.pattern);
      if (!regex.test(value.trim())) {
        return field.helperText || `Format ${field.label} tidak valid`;
      }
    }

    if (field.type === 'email' && value.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value.trim())) {
        return 'Format email tidak valid';
      }
    }

    return null;
  };

  const handleChange = (fieldName: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    if (errors[fieldName]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    // Validate name
    if (!name.trim()) {
      newErrors['_name'] = 'Nama wajib diisi';
    }

    // Validate fields
    FORM_FIELDS.forEach((field) => {
      if (field.type === 'toggle') return; // toggle doesn't need validation
      const error = validateField(field, formData[field.name]);
      if (error) {
        newErrors[field.name] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(name.trim(), formData);
  };

  // Handle selecting a name from the response names dropdown
  const handleSelectResponseName = useCallback((selectedResponseName: string) => {
    setName(selectedResponseName);
    setNameQuery(selectedResponseName);
    setIsDropdownOpen(false);
    setFilteredNames([]);
    setHighlightIdx(-1);
    // Auto-check immediately
    if (onCheckExisting && selectedResponseName.trim() !== lastCheckedName) {
      setLastCheckedName(selectedResponseName.trim());
      onCheckExisting(selectedResponseName.trim());
    }
  }, [onCheckExisting, lastCheckedName]);

  // Highlight matching text in dropdown
  const highlightNameMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase().trim());
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + query.trim().length);
    const after = text.slice(idx + query.trim().length);
    return (
      <>
        {before}
        <span className="search-highlight">{match}</span>
        {after}
      </>
    );
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (nameContainerRef.current && !nameContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const showFotoUpload = formData['Apakah sudah Foto Bareng'] === 'TRUE';

  const renderField = (field: FormField) => {
    const hasError = !!errors[field.name];
    const isPrefilled =
      isFromMaster &&
      field.prefillFromMaster &&
      masterData &&
      !!masterData[field.prefillFromMaster];
    const isFromExisting = !!(isUpdateMode && existingData && existingData[field.name]);

    if (field.type === 'toggle') {
      const isChecked = formData[field.name] === 'TRUE';
      return (
        <div key={field.name} className="form-group">
          <div className="toggle-wrapper">
            <label className="toggle-label" htmlFor={`field-${field.name}`}>
              {field.label}
            </label>
            <button
              id={`field-${field.name}`}
              type="button"
              role="switch"
              aria-checked={isChecked}
              className={`toggle-switch ${isChecked ? 'active' : ''}`}
              onClick={() =>
                handleChange(field.name, isChecked ? 'FALSE' : 'TRUE')
              }
              disabled={isSubmitting}
            >
              <span className="toggle-thumb" />
            </button>
          </div>
        </div>
      );
    }

    if (field.type === 'select') {
      return (
        <div key={field.name} className="form-group">
          <label htmlFor={`field-${field.name}`} className="field-label">
            {field.label}
            {field.required && <span className="required-mark">*</span>}
            {isFromExisting && <span className="prefilled-badge update-badge">data sebelumnya</span>}
            {!isFromExisting && isPrefilled && <span className="prefilled-badge">dari data rekap FST</span>}
          </label>
          <select
            id={`field-${field.name}`}
            className={`form-select ${hasError ? 'field-error' : ''}`}
            value={formData[field.name] ?? ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            disabled={isSubmitting}
          >
            <option value="">Pilih {field.label}...</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {hasError && <p className="error-text">{errors[field.name]}</p>}
        </div>
      );
    }

    if (field.type === 'textarea') {
      return (
        <div key={field.name} className="form-group">
          <label htmlFor={`field-${field.name}`} className="field-label">
            {field.label}
            {field.required && <span className="required-mark">*</span>}
            {isFromExisting && <span className="prefilled-badge update-badge">data sebelumnya</span>}
            {!isFromExisting && isPrefilled && <span className="prefilled-badge">dari data rekap FST</span>}
          </label>
          <textarea
            id={`field-${field.name}`}
            className={`form-textarea ${hasError ? 'field-error' : ''}`}
            placeholder={field.placeholder}
            value={formData[field.name] ?? ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            disabled={isSubmitting}
            rows={3}
          />
          {field.helperText && !hasError && (
            <p className="helper-text">{field.helperText}</p>
          )}
          {hasError && <p className="error-text">{errors[field.name]}</p>}
        </div>
      );
    }

    if (field.name === 'Prodi') {
      return (
        <div key={field.name} className="form-group">
          <label htmlFor={`field-${field.name}`} className="field-label">
            {field.label}
            {field.required && <span className="required-mark">*</span>}
            {isFromExisting && <span className="prefilled-badge update-badge">data sebelumnya</span>}
            {!isFromExisting && isPrefilled && <span className="prefilled-badge">dari data rekap FST</span>}
            {prodiCapInfo && prodiCapInfo.isFull && (
              <span className="prefilled-badge cap-full-badge">⚠️ Kuota Penuh</span>
            )}
            {prodiCapInfo && prodiCapInfo.isWarning && !prodiCapInfo.isFull && (
              <span className="prefilled-badge cap-warn-badge">⚡ Hampir Penuh</span>
            )}
          </label>
          <ProdiSelect
            value={formData[field.name] ?? ''}
            onChange={(val) => handleChange(field.name, val)}
            disabled={isSubmitting}
            hasError={hasError}
            placeholder={field.placeholder || 'Pilih / ketik Prodi (misal: sisfor, tekling)...'}
            stats={statsData}
          />
          {prodiCapInfo && prodiCapInfo.isFull && (
            <div className="prodi-cap-warning-box full fade-in">
              <div className="cap-warning-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <strong>Peringatan Kuota Terpenuhi ({prodiCapInfo.count}/{prodiCapInfo.target})</strong>
              </div>
              <p>
                Kuota pendaftaran untuk prodi <strong>{normalizeProdi(selectedProdiName)}</strong> telah mencapai kapasitas maksimal ({prodiCapInfo.count}/{prodiCapInfo.target} foto bareng). Pendaftaran baru tetap tercatat namun masuk antrean.
              </p>
            </div>
          )}
          {prodiCapInfo && prodiCapInfo.isWarning && !prodiCapInfo.isFull && (
            <div className="prodi-cap-warning-box warning fade-in">
              <div className="cap-warning-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <strong>Kuota Prodi Hampir Penuh ({prodiCapInfo.count}/{prodiCapInfo.target})</strong>
              </div>
              <p>
                Tersisa {prodiCapInfo.target - prodiCapInfo.count} slot foto bareng lagi untuk prodi <strong>{normalizeProdi(selectedProdiName)}</strong>.
              </p>
            </div>
          )}
          {field.helperText && !hasError && !prodiCapInfo?.isFull && !prodiCapInfo?.isWarning && (
            <p className="helper-text">{field.helperText}</p>
          )}
          {hasError && <p className="error-text">{errors[field.name]}</p>}
        </div>
      );
    }

    // Default: text, tel, email
    return (
      <div key={field.name} className="form-group">
        <label htmlFor={`field-${field.name}`} className="field-label">
          {field.label}
          {field.required && <span className="required-mark">*</span>}
          {isFromExisting && <span className="prefilled-badge update-badge">data sebelumnya</span>}
          {!isFromExisting && isPrefilled && <span className="prefilled-badge">dari data rekap FST</span>}
        </label>
        <input
          id={`field-${field.name}`}
          type={field.type}
          className={`form-input ${hasError ? 'field-error' : ''} ${isPrefilled || isFromExisting ? 'prefilled' : ''}`}
          placeholder={field.placeholder}
          value={formData[field.name] ?? ''}
          onChange={(e) => handleChange(field.name, e.target.value)}
          disabled={isSubmitting}
        />
        {field.helperText && !hasError && (
          <p className="helper-text">{field.helperText}</p>
        )}
        {hasError && <p className="error-text">{errors[field.name]}</p>}
      </div>
    );
  };

  return (
    <div className="data-form-container">
      {/* Total capacity warning banner */}
      {totalCapInfo.isFull && (
        <div className="total-cap-banner full fade-in">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div className="total-cap-text">
            <strong>Peringatan Kapasitas Total FST Terpenuhi ({totalCapInfo.count}/{totalCapInfo.target})</strong>
            <span>Kuota target foto bareng FST sudah mencapai batas maksimal.</span>
          </div>
        </div>
      )}
      {totalCapInfo.isWarning && !totalCapInfo.isFull && (
        <div className="total-cap-banner warning fade-in">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="total-cap-text">
            <strong>Peringatan Kuota Total FST ({totalCapInfo.count}/{totalCapInfo.target})</strong>
            <span>Kuota foto bareng FST hampir memenuhi target maksimal.</span>
          </div>
        </div>
      )}

      {/* Update mode banner */}
      {isUpdateMode && (
        <div className="update-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <div className="update-banner-text">
            <strong>Data kamu sudah pernah disubmit.</strong>
            <span>Kamu bisa memperbarui data di bawah ini.</span>
          </div>
        </div>
      )}

      {/* Name banner / input */}
      {isFromMaster ? (
        <div className="selected-name-banner">
          <div className="selected-name-info">
            <span className="selected-name-label">Peserta</span>
            <span className="selected-name-value">{selectedName}</span>
            {masterData?.['NIM'] && (
              <span className="selected-name-nim">NIM: {masterData['NIM']}</span>
            )}
          </div>
          <button
            type="button"
            className="btn-change-name"
            onClick={onBack}
            disabled={isSubmitting}
          >
            Ganti
          </button>
        </div>
      ) : (
        <div className="manual-name-section">
          <div className="manual-name-banner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            <span>Yuk, isi biodatamu di bawah ini!</span>
          </div>
          <div className="form-group" ref={nameContainerRef}>
            <label htmlFor="manual-name" className="field-label">
              Nama Lengkap <span className="required-mark">*</span>
            </label>
            <div className="manual-name-input-row">
              <input
                id="manual-name"
                type="text"
                className={`form-input ${errors['_name'] ? 'field-error' : ''}`}
                placeholder="Ketik nama untuk mencari..."
                value={name ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setName(val);
                  setNameQuery(val);
                  if (errors['_name']) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next['_name'];
                      return next;
                    });
                  }
                  // Filter response names for dropdown
                  if (val.trim().length >= 2 && responseNames && responseNames.length > 0) {
                    const q = val.toLowerCase().trim();
                    const matches = responseNames.filter(n => n.toLowerCase().includes(q));
                    setFilteredNames(matches);
                    setIsDropdownOpen(matches.length > 0);
                    setHighlightIdx(-1);
                  } else {
                    setFilteredNames([]);
                    setIsDropdownOpen(false);
                  }
                  // Debounced auto-check
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  if (val.trim().length >= 3 && onCheckExisting) {
                    debounceRef.current = setTimeout(() => {
                      if (val.trim() !== lastCheckedName) {
                        setLastCheckedName(val.trim());
                        onCheckExisting(val.trim());
                      }
                    }, 800);
                  }
                }}
                onKeyDown={(e) => {
                  if (!isDropdownOpen) return;
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setHighlightIdx(prev => prev < filteredNames.length - 1 ? prev + 1 : 0);
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setHighlightIdx(prev => prev > 0 ? prev - 1 : filteredNames.length - 1);
                  } else if (e.key === 'Enter' && highlightIdx >= 0) {
                    e.preventDefault();
                    handleSelectResponseName(filteredNames[highlightIdx]);
                  } else if (e.key === 'Escape') {
                    setIsDropdownOpen(false);
                  }
                }}
                onFocus={() => {
                  if (filteredNames.length > 0) setIsDropdownOpen(true);
                }}
                disabled={isSubmitting || isCheckingExisting}
                autoComplete="off"
                role="combobox"
                aria-expanded={isDropdownOpen}
                aria-controls="response-name-listbox"
              />
              {isCheckingExisting && (
                <div className="btn-check-existing checking">
                  <span className="btn-loading">
                    <span className="spinner" />
                  </span>
                </div>
              )}
            </div>

            {/* Autocomplete dropdown */}
            {isDropdownOpen && filteredNames.length > 0 && (
              <ul
                ref={nameListRef}
                id="response-name-listbox"
                className="search-dropdown response-name-dropdown"
                role="listbox"
              >
                <li className="response-dropdown-header">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  Ditemukan di spreadsheet ({filteredNames.length})
                </li>
                {filteredNames.slice(0, 20).map((rName, idx) => (
                  <li
                    key={`resp-${idx}`}
                    className={`search-dropdown-item ${idx === highlightIdx ? 'highlighted' : ''}`}
                    role="option"
                    aria-selected={idx === highlightIdx}
                    onClick={() => handleSelectResponseName(rName)}
                    onMouseEnter={() => setHighlightIdx(idx)}
                  >
                    <div className="dropdown-item-name">
                      {highlightNameMatch(rName, nameQuery)}
                    </div>
                  </li>
                ))}
                {filteredNames.length > 20 && (
                  <li className="search-dropdown-more">
                    +{filteredNames.length - 20} nama lainnya, ketik lebih spesifik...
                  </li>
                )}
              </ul>
            )}

            {errors['_name'] && (
              <p className="error-text">{errors['_name']}</p>
            )}
          </div>
          <button
            type="button"
            className="btn-change-name"
            onClick={onBack}
            disabled={isSubmitting}
            style={{ alignSelf: 'flex-start', marginBottom: '8px' }}
          >
            ← Kembali cari nama
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="data-form">
        <h3 className="form-title">
          {isUpdateMode ? 'Perbarui Data Kamu' : 'Lengkapi Data Kamu'}
        </h3>

        {FORM_FIELDS.map(renderField)}

        <div className="foto-hint">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
          <span>Langkah berikutnya: Upload foto bareng (dapat dilewati jika belum foto)</span>
        </div>

        <button type="submit" className="btn-submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="btn-loading">
              <span className="spinner" />
              Memproses...
            </span>
          ) : (
            'Lanjut ke Upload Foto →'
          )}
        </button>
      </form>
    </div>
  );
}
