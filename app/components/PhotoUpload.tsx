'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
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

  // Live Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

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

  // Camera stream controls
  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraOpen(false);
    setIsCameraLoading(false);
    setCameraError(null);
  }, []);

  const startCamera = useCallback(async (mode: 'environment' | 'user' = facingMode) => {
    if (selectedFiles.length >= UPLOAD_CONFIG.maxFiles) {
      setLocalError(`Maksimal ${UPLOAD_CONFIG.maxFiles} foto sudah tercapai.`);
      return;
    }

    setIsCameraLoading(true);
    setCameraError(null);
    setIsCameraOpen(true);

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Kamera langsung tidak didukung peramban.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraLoading(false);
    } catch (err) {
      console.warn('Live camera error:', err);
      setIsCameraLoading(false);
      setCameraError('Gagal mengakses kamera langsung. Membuka kamera bawaan HP...');
      setTimeout(() => {
        stopCamera();
        cameraInputRef.current?.click();
      }, 800);
    }
  }, [facingMode, selectedFiles.length, stopCamera]);

  const toggleCameraFacing = useCallback(() => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  }, [facingMode, startCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const fileName = `Foto_Kamera_${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        addFiles([file]);
        stopCamera();
      },
      'image/jpeg',
      0.92
    );
  }, [facingMode, addFiles, stopCamera]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

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
      <h3 className="form-title">Upload Foto Bareng</h3>
      <p className="photo-upload-subtitle">
        Pilih atau ambil foto langsung (maks {UPLOAD_CONFIG.maxFiles} foto, masing-masing maks {UPLOAD_CONFIG.maxSizeMB}MB). Foto akan tersimpan di Cloudflare R2 Storage di folder <strong>{prodi || 'Lainnya'}</strong>.
      </p>

      {error && (
        <div className="submit-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Hidden File Inputs */}
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

      {/* Fallback Native Camera Input */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = '';
        }}
        style={{ display: 'none' }}
        disabled={isUploading}
      />

      {/* Hidden Canvas for Camera Snapshots */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Action Selection Buttons */}
      <div className="photo-action-buttons">
        <button
          type="button"
          className="btn-camera-toggle"
          onClick={() => startCamera('environment')}
          disabled={isUploading || selectedFiles.length >= UPLOAD_CONFIG.maxFiles}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span>📷 Ambil Foto Kamera</span>
        </button>

        <button
          type="button"
          className="btn-gallery-select"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || selectedFiles.length >= UPLOAD_CONFIG.maxFiles}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
          <span>📁 Pilih dari Galeri</span>
        </button>
      </div>

      {/* Drop zone */}
      <div
        className={`drop-zone ${dragActive ? 'drag-active' : ''} ${isUploading ? 'uploading' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <div className="drop-zone-content">
          <svg className="drop-zone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
          <p className="drop-zone-text">
            {dragActive ? 'Lepas untuk menambahkan foto' : 'Atau seret foto ke sini'}
          </p>
          <p className="drop-zone-hint">JPEG, PNG, WebP (Maks {UPLOAD_CONFIG.maxFiles} foto)</p>
        </div>
      </div>

      {/* Live Camera Modal */}
      {isCameraOpen && (
        <div className="camera-modal-overlay fade-in">
          <div className="camera-modal-content">
            <div className="camera-header">
              <div className="camera-header-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>Kamera Live</span>
              </div>
              <button
                type="button"
                className="btn-close-camera"
                onClick={stopCamera}
                aria-label="Tutup kamera"
              >
                ✕
              </button>
            </div>

            <div className="camera-viewport">
              {isCameraLoading && (
                <div className="camera-loading">
                  <span className="spinner" />
                  <span>Membuka kamera...</span>
                </div>
              )}
              {cameraError && (
                <div className="camera-error-msg">
                  <span>{cameraError}</span>
                </div>
              )}
              <video
                ref={videoRef}
                className={`camera-video ${facingMode === 'user' ? 'mirrored' : ''}`}
                playsInline
                muted
                autoPlay
              />
              <div className="camera-grid-guide" />
            </div>

            <div className="camera-controls">
              <button
                type="button"
                className="btn-camera-flip"
                onClick={toggleCameraFacing}
                disabled={isCameraLoading}
                title="Ganti kamera depan/belakang"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M20 10c0-4.418-3.582-8-8-8s-8 3.582-8 8" />
                  <path d="M4 14c0 4.418 3.582 8 8 8s8-3.582 8-8" />
                  <path d="m17 13 3 3 3-3" />
                  <path d="m7 11-3-3-3 3" />
                </svg>
                <span>Putar</span>
              </button>

              <button
                type="button"
                className="btn-camera-shutter"
                onClick={capturePhoto}
                disabled={isCameraLoading}
                title="Ambil foto"
              >
                <div className="shutter-inner" />
              </button>

              <button
                type="button"
                className="btn-camera-cancel"
                onClick={stopCamera}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
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
