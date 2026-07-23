'use client';

import { useState, useEffect } from 'react';
import { FORM_FIELDS, type FormField, type MasterParticipant } from '../lib/config';

interface DataFormProps {
  selectedName: string;
  masterData: MasterParticipant | null; // null when user skipped (manual entry)
  onSubmit: (name: string, fields: Record<string, string>) => void;
  onBack: () => void;
  isSubmitting: boolean;
  isFromMaster: boolean;
}

export default function DataForm({
  selectedName,
  masterData,
  onSubmit,
  onBack,
  isSubmitting,
  isFromMaster,
}: DataFormProps) {
  const [name, setName] = useState(selectedName);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form with pre-filled data from Master
  useEffect(() => {
    const initial: Record<string, string> = {};
    FORM_FIELDS.forEach((field) => {
      if (field.prefillFromMaster && masterData && masterData[field.prefillFromMaster]) {
        initial[field.name] = masterData[field.prefillFromMaster];
      } else if (field.type === 'toggle') {
        initial[field.name] = 'FALSE';
      } else {
        initial[field.name] = '';
      }
    });
    setFormData(initial);
    setName(selectedName);
  }, [masterData, selectedName]);

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

  const showFotoUpload = formData['Apakah sudah Foto Bareng'] === 'TRUE';

  const renderField = (field: FormField) => {
    const hasError = !!errors[field.name];
    const isPrefilled =
      isFromMaster &&
      field.prefillFromMaster &&
      masterData &&
      !!masterData[field.prefillFromMaster];

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
            {isPrefilled && <span className="prefilled-badge">dari data master</span>}
          </label>
          <select
            id={`field-${field.name}`}
            className={`form-select ${hasError ? 'field-error' : ''}`}
            value={formData[field.name]}
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
            {isPrefilled && <span className="prefilled-badge">dari data master</span>}
          </label>
          <textarea
            id={`field-${field.name}`}
            className={`form-textarea ${hasError ? 'field-error' : ''}`}
            placeholder={field.placeholder}
            value={formData[field.name]}
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

    // Default: text, tel, email
    return (
      <div key={field.name} className="form-group">
        <label htmlFor={`field-${field.name}`} className="field-label">
          {field.label}
          {field.required && <span className="required-mark">*</span>}
          {isPrefilled && <span className="prefilled-badge">dari data master</span>}
        </label>
        <input
          id={`field-${field.name}`}
          type={field.type}
          className={`form-input ${hasError ? 'field-error' : ''} ${isPrefilled ? 'prefilled' : ''}`}
          placeholder={field.placeholder}
          value={formData[field.name]}
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
            <span>Nama kamu tidak ada di daftar Master. Silakan isi manual.</span>
          </div>
          <div className="form-group">
            <label htmlFor="manual-name" className="field-label">
              Nama Lengkap <span className="required-mark">*</span>
            </label>
            <input
              id="manual-name"
              type="text"
              className={`form-input ${errors['_name'] ? 'field-error' : ''}`}
              placeholder="Masukkan nama lengkap..."
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors['_name']) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next['_name'];
                    return next;
                  });
                }
              }}
              disabled={isSubmitting}
            />
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
        <h3 className="form-title">Lengkapi Data Kamu</h3>

        {FORM_FIELDS.map(renderField)}

        {/* Show hint about foto upload */}
        {showFotoUpload && (
          <div className="foto-hint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
            <span>Upload foto akan dilakukan di langkah berikutnya</span>
          </div>
        )}

        <button type="submit" className="btn-submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="btn-loading">
              <span className="spinner" />
              Mengirim...
            </span>
          ) : showFotoUpload ? (
            'Lanjut ke Upload Foto →'
          ) : (
            'Kirim Data'
          )}
        </button>
      </form>
    </div>
  );
}
