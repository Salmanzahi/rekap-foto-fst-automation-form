'use client';

import { useState, useEffect, useCallback } from 'react';
import { EVENT_INFO, type MasterParticipant } from './lib/config';
import { fetchParticipants, fetchExistingSubmission, fetchResponseNames, submitData } from './lib/api';
import NameSearch from './components/NameSearch';
import DataForm from './components/DataForm';
import PhotoUpload from './components/PhotoUpload';
import SuccessScreen from './components/SuccessScreen';

type AppStep = 'search' | 'form' | 'upload' | 'success';

export default function Home() {
  const [step, setStep] = useState<AppStep>('search');
  const [participants, setParticipants] = useState<MasterParticipant[]>([]);
  const [isLoadingNames, setIsLoadingNames] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Selected data
  const [selectedName, setSelectedName] = useState('');
  const [selectedMasterData, setSelectedMasterData] = useState<MasterParticipant | null>(null);
  const [isFromMaster, setIsFromMaster] = useState(false);

  // Existing submission data (for update mode)
  const [existingData, setExistingData] = useState<Record<string, string> | null>(null);
  const [existingRowIndex, setExistingRowIndex] = useState<number | undefined>(undefined);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [isCheckingSubmission, setIsCheckingSubmission] = useState(false);
  const [isCheckingExisting, setIsCheckingExisting] = useState(false);

  // Form data
  const [formFields, setFormFields] = useState<Record<string, string>>({});

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

  // Response spreadsheet names (for manual entry autocomplete)
  const [responseNames, setResponseNames] = useState<string[]>([]);

  // Fetch participants on mount
  useEffect(() => {
    let cancelled = false;

    async function loadParticipants() {
      setIsLoadingNames(true);
      setLoadError(null);
      try {
        const data = await fetchParticipants();
        if (!cancelled) {
          setParticipants(data);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error
              ? err.message
              : 'Gagal memuat data peserta. Silakan muat ulang halaman.'
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingNames(false);
        }
      }
    }

    loadParticipants();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch response names on mount (for manual entry autocomplete)
  useEffect(() => {
    let cancelled = false;
    async function loadResponseNames() {
      try {
        const names = await fetchResponseNames();
        if (!cancelled) setResponseNames(names);
      } catch {
        // Non-critical — autocomplete just won't have data
      }
    }
    loadResponseNames();
    return () => { cancelled = true; };
  }, []);

  // Check for existing submission and proceed to form
  const checkAndProceed = useCallback(async (name: string) => {
    setIsCheckingSubmission(true);
    try {
      const result = await fetchExistingSubmission(name);
      if (result.submitted && result.data) {
        setExistingData(result.data);
        setExistingRowIndex(result.rowIndex);
        setIsUpdateMode(true);
      } else {
        setExistingData(null);
        setExistingRowIndex(undefined);
        setIsUpdateMode(false);
      }
    } catch (err) {
      console.warn('Failed to check existing submission:', err);
      setExistingData(null);
      setExistingRowIndex(undefined);
      setIsUpdateMode(false);
    } finally {
      setIsCheckingSubmission(false);
      setStep('form');
    }
  }, []);

  // When user selects a name from Master
  const handleNameSelect = useCallback((participant: MasterParticipant) => {
    setSelectedName(participant['NAMA LENGKAP']);
    setSelectedMasterData(participant);
    setIsFromMaster(true);
    setSubmitError(null);
    checkAndProceed(participant['NAMA LENGKAP']);
  }, [checkAndProceed]);

  // When user skips (name not in Master)
  const handleSkip = useCallback((searchQuery?: string) => {
    const manualName = searchQuery?.trim() || '';
    setSelectedName(manualName);
    setSelectedMasterData(null);
    setIsFromMaster(false);
    setSubmitError(null);

    if (manualName) {
      checkAndProceed(manualName);
    } else {
      setExistingData(null);
      setExistingRowIndex(undefined);
      setIsUpdateMode(false);
      setStep('form');
    }
  }, [checkAndProceed]);

  // When manual-entry user clicks "Cek Data" to check response spreadsheet
  const handleCheckExisting = useCallback(async (name: string) => {
    setIsCheckingExisting(true);
    try {
      const result = await fetchExistingSubmission(name);
      if (result.submitted && result.data) {
        setExistingData(result.data);
        setExistingRowIndex(result.rowIndex);
        setIsUpdateMode(true);
        setSelectedName(name);
      } else {
        setExistingData(null);
        setExistingRowIndex(undefined);
        setIsUpdateMode(false);
      }
    } catch (err) {
      console.warn('Failed to check existing submission:', err);
      setExistingData(null);
      setExistingRowIndex(undefined);
      setIsUpdateMode(false);
    } finally {
      setIsCheckingExisting(false);
    }
  }, []);

  // When form is submitted
  const handleFormSubmit = useCallback(
    async (name: string, fields: Record<string, string>) => {
      setSelectedName(name);
      setFormFields(fields);

      // If user wants to upload photos, go to upload step
      if (fields['Apakah sudah Foto Bareng'] === 'TRUE') {
        setStep('upload');
        return;
      }

      // Otherwise submit directly without photos
      setIsSubmitting(true);
      setSubmitError(null);

      try {
        await submitData(name, fields, undefined, isUpdateMode ? existingRowIndex : undefined);
        setUploadedUrls([]);
        setStep('success');
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : 'Gagal mengirim data.'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [isUpdateMode, existingRowIndex]
  );

  // When photos are uploaded to R2 (or skipped), send data + R2 photo URLs to Google Apps Script / Spreadsheet
  const handleUploadComplete = useCallback(
    async (urls: string[]) => {
      setUploadedUrls(urls);
      setIsSubmitting(true);
      setSubmitError(null);
      setUploadError(null);

      try {
        const fieldsWithPhotos = {
          ...formFields,
          'Upload Foto Bareng': urls.join('\n'),
        };
        await submitData(selectedName, fieldsWithPhotos, undefined, isUpdateMode ? existingRowIndex : undefined);
        setFormFields(fieldsWithPhotos);
        setStep('success');
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : 'Gagal mengirim data peserta.'
        );
        setIsUploading(false);
      } finally {
        setIsSubmitting(false);
        setIsUploading(false);
      }
    },
    [formFields, selectedName, isUpdateMode, existingRowIndex]
  );

  const handleBack = useCallback(() => {
    setStep('search');
    setSelectedName('');
    setSelectedMasterData(null);
    setSubmitError(null);
    setExistingData(null);
    setExistingRowIndex(undefined);
    setIsUpdateMode(false);
  }, []);

  const handleBackToForm = useCallback(() => {
    setStep('form');
    setUploadError(null);
  }, []);

  const handleReset = useCallback(() => {
    setStep('search');
    setSelectedName('');
    setSelectedMasterData(null);
    setIsFromMaster(false);
    setFormFields({});
    setUploadedUrls([]);
    setSubmitError(null);
    setUploadError(null);
    setExistingData(null);
    setExistingRowIndex(undefined);
    setIsUpdateMode(false);
  }, []);

  // Step number for the indicator
  const stepNumber =
    step === 'search' ? 1 : step === 'form' ? 2 : step === 'upload' ? 3 : 4;

  return (
    <div className="app-wrapper">
      {/* Decorative background */}
      <div className="bg-decoration">
        <div className="bg-gradient-1" />
        <div className="bg-gradient-2" />
      </div>

      <main className="main-container">
        {/* Header */}
        <header className="app-header">
          <div className="header-badge">{EVENT_INFO.organization}</div>
          <h1 className="header-title">{EVENT_INFO.title}</h1>
          <p className="header-subtitle">{EVENT_INFO.subtitle}</p>
        </header>

        {/* Content Card */}
        <div className="content-card">
          {/* Step indicator */}
          <div className="step-indicator">
            <div className={`step-dot ${stepNumber === 1 ? 'active' : stepNumber > 1 ? 'completed' : ''}`}>
              <span>1</span>
            </div>
            <div className={`step-line ${stepNumber > 1 ? 'active' : ''}`} />
            <div className={`step-dot ${stepNumber === 2 ? 'active' : stepNumber > 2 ? 'completed' : ''}`}>
              <span>2</span>
            </div>
            <div className={`step-line ${stepNumber > 2 ? 'active' : ''}`} />
            <div className={`step-dot ${stepNumber === 3 ? 'active' : stepNumber > 3 ? 'completed' : ''}`}>
              <span>3</span>
            </div>
            <div className={`step-line ${stepNumber > 3 ? 'active' : ''}`} />
            <div className={`step-dot ${stepNumber === 4 ? 'active' : ''}`}>
              <span>✓</span>
            </div>
          </div>

          {/* Loading state */}
          {isLoadingNames && (
            <div className="loading-container">
              <div className="loading-spinner" />
              <p className="loading-text">Memuat data peserta...</p>
            </div>
          )}

          {/* Checking submission state */}
          {isCheckingSubmission && (
            <div className="loading-container">
              <div className="loading-spinner" />
              <p className="loading-text">Memeriksa data sebelumnya...</p>
            </div>
          )}

          {/* Error state */}
          {loadError && (
            <div className="error-container">
              <div className="error-icon">!</div>
              <p className="error-message">{loadError}</p>
              <button
                className="btn-retry"
                onClick={() => window.location.reload()}
              >
                Muat Ulang
              </button>
            </div>
          )}

          {/* Step 1: Search */}
          {!isLoadingNames && !isCheckingSubmission && !loadError && step === 'search' && (
            <div className="step-content fade-in">
              <p className="step-description">{EVENT_INFO.description}</p>
              <NameSearch
                participants={participants}
                onSelect={handleNameSelect}
                onSkip={handleSkip}
              />
              <div className="participant-count">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="16"
                  height="16"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>{participants.length} peserta terdaftar</span>
              </div>
            </div>
          )}

          {/* Step 2: Form */}
          {!isLoadingNames && !isCheckingSubmission && !loadError && step === 'form' && (
            <div className="step-content fade-in">
              {submitError && (
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
                  <span>{submitError}</span>
                </div>
              )}
              <DataForm
                selectedName={selectedName}
                masterData={selectedMasterData}
                onSubmit={handleFormSubmit}
                onBack={handleBack}
                isSubmitting={isSubmitting}
                isFromMaster={isFromMaster}
                existingData={existingData}
                isUpdateMode={isUpdateMode}
                onCheckExisting={!isFromMaster ? handleCheckExisting : undefined}
                isCheckingExisting={isCheckingExisting}
                responseNames={!isFromMaster ? responseNames : undefined}
              />
            </div>
          )}

          {/* Step 3: Photo Upload */}
          {step === 'upload' && (
            <div className="step-content fade-in">
              <PhotoUpload
                participantName={selectedName}
                prodi={formFields['Prodi'] || 'Lainnya'}
                kelompok={formFields['Kelompok'] || '-'}
                onUploadComplete={handleUploadComplete}
                onBack={handleBackToForm}
                isUploading={isUploading}
                setIsUploading={setIsUploading}
                uploadError={uploadError}
              />
            </div>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <div className="step-content fade-in">
              <SuccessScreen
                name={selectedName}
                submittedData={formFields}
                photoUrls={uploadedUrls}
                onReset={handleReset}
                isUpdateMode={isUpdateMode}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="app-footer">
          <p>
            &copy; {new Date().getFullYear()} {EVENT_INFO.organization}. All
            rights reserved.
          </p>
        </footer>
      </main>
    </div>
  );
}
