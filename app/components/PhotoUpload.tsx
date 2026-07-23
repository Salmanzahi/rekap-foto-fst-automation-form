'use client';

import { useState, useRef, useCallback } from 'react';
import { UPLOAD_CONFIG } from '../lib/config';

interface PhotoUploadProps {
  participantName: string;
  prodi: string;
  kelompok: string;
  onUploadComplete: (urls: string[]) => void;
  onBack: () => void;
  isUploading: boolean;
  setIsUploading: (v: boolean) => void;
  uploadError: string | null;
}

interface SelectedFile {
  file: File;
  preview: string;
  id: string;
}

export default function PhotoUpload({
  participantName,
  prodi,
  kelompok,
  onUploadComplete,
  onBack,
  isUploading,
  setIsUploading,
  uploadError,
}: PhotoUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      setLocalError(null);
      const filesArray = Array.from(newFiles);

      if (selectedFiles.length + filesArray.length > UPLOAD_CONFIG.maxFiles) {
        setLocalError(
          `Maksimal ${UPLOAD_CONFIG.maxFiles} foto. Kamu sudah memilih ${selectedFiles.length}.`
        );
        return;
      }

      const validFiles: SelectedFile[] = [];

      for (const file of filesArray) {
        if (!UPLOAD_CONFIG.acceptedTypes.includes(file.type)) {
          setLocalError(
            `"${file.name}" bukan format yang didukung. Gunakan JPEG, PNG, atau WebP.`
          );
          return;
        }
        if (file.size > UPLOAD_CONFIG.maxSizeMB * 1024 * 1024) {
          setLocalError(
            `"${file.name}" terlalu besar (${(file.size / 1024 / 1024).toFixed(1)}MB). Maks ${UPLOAD_CONFIG.maxSizeMB}MB.`
          );
          return;
        }

        validFiles.push({
          file,
          preview: URL.createObjectURL(file),
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        });
      }

      setSelectedFiles((prev) => [...prev, ...validFiles]);
    },
    [selectedFiles.length]
  );

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => {
      const removed = prev.find((f) => f.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((f) => f.id !== id);
    });
    setLocalError(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setLocalError('Pilih minimal 1 foto untuk diupload');
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);
    setLocalError(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((sf) => {
        formData.append('files', sf.file);
      });
      formData.append('name', participantName);
      formData.append('prodi', prodi);
      formData.append('kelompok', kelompok);

      // Progress animation
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev < 85 ? prev + 10 : prev));
      }, 300);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(95);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error || `Upload ke R2 gagal (HTTP ${response.status})`
        );
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setUploadProgress(100);

      // Cleanup preview URLs
      selectedFiles.forEach((sf) => URL.revokeObjectURL(sf.preview));

      onUploadComplete(data.urls);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : 'Gagal mengupload foto ke R2.'
      );
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSkip = () => {
    selectedFiles.forEach((sf) => URL.revokeObjectURL(sf.preview));
    onUploadComplete([]);
  };

  const error = uploadError || localError;

  return (
    <div className="photo-upload-container">
      <h3 className="form-title">Upload Foto Bareng (Cloudflare R2)</h3>
      <p className="photo-upload-subtitle">
        Pilih foto yang ingin kamu upload (maks {UPLOAD_CONFIG.maxFiles} foto,
        masing-masing maks {UPLOAD_CONFIG.maxSizeMB}MB). Foto akan tersimpan di Cloudflare R2 Storage di folder <strong>{prodi || 'Lainnya'}</strong>.
      </p>

      {error && (
        <div className="submit-error">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="20"
            height="20"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={UPLOAD_CONFIG.acceptedExtensions}
        multiple
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = '';
        }}
        style={{ display: 'none' }}
        disabled={isUploading}
      />

      {/* Drop zone */}
      <div
        className={`drop-zone ${dragActive ? 'drag-active' : ''} ${
          isUploading ? 'uploading' : ''
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <div className="drop-zone-content">
          <svg
            className="drop-zone-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            width="44"
            height="44"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
          <p className="drop-zone-text">
            {dragActive
              ? 'Lepas untuk menambahkan foto'
              : 'Klik atau seret foto ke sini'}
          </p>
          <p className="drop-zone-hint">JPEG, PNG, WebP</p>
        </div>
      </div>

      {/* Selected files preview */}
      {selectedFiles.length > 0 && (
        <div className="photo-preview-grid">
          {selectedFiles.map((sf) => (
            <div key={sf.id} className="photo-preview-item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sf.preview}
                alt={sf.file.name}
                className="photo-preview-img"
              />
              <div className="photo-preview-overlay">
                <span className="photo-preview-name">
                  {sf.file.name.length > 15
                    ? `${sf.file.name.substring(0, 12)}...`
                    : sf.file.name}
                </span>
                <span className="photo-preview-size">
                  {(sf.file.size / 1024 / 1024).toFixed(1)}MB
                </span>
              </div>
              {!isUploading && (
                <button
                  type="button"
                  className="photo-remove-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(sf.id);
                  }}
                  aria-label={`Hapus ${sf.file.name}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    width="14"
                    height="14"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload progress */}
      {isUploading && (
        <div className="upload-progress-container">
          <div className="upload-progress-bar">
            <div
              className="upload-progress-fill"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <span className="upload-progress-text">
            Mengupload ke R2 Storage... {uploadProgress}%
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="photo-upload-actions">
        <button
          type="button"
          className="btn-submit"
          onClick={handleUpload}
          disabled={isUploading || selectedFiles.length === 0}
        >
          {isUploading ? (
            <span className="btn-loading">
              <span className="spinner" />
              Mengupload ke Cloudflare R2...
            </span>
          ) : (
            `Upload ${selectedFiles.length} Foto & Kirim`
          )}
        </button>
        <button
          type="button"
          className="btn-skip-upload"
          onClick={handleSkip}
          disabled={isUploading}
        >
          Lewati upload, kirim data saja
        </button>
        <button
          type="button"
          className="btn-back-upload"
          onClick={onBack}
          disabled={isUploading}
        >
          ← Kembali
        </button>
      </div>
    </div>
  );
}
