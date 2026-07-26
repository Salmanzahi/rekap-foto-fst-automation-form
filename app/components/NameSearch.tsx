'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { MasterParticipant } from '../lib/config';

interface NameSearchProps {
  participants: MasterParticipant[];
  onSelect: (participant: MasterParticipant) => void;
  onSkip: (searchQuery?: string) => void;
  disabled?: boolean;
}

export default function NameSearch({
  participants,
  onSelect,
  onSkip,
  disabled,
}: NameSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Derived filtered participants based on query using useMemo
  const filtered = useMemo(() => {
    if (query.trim().length < 1) return [];
    const q = query.toLowerCase().trim();
    return participants.filter((p) =>
      p['NAMA LENGKAP']?.toLowerCase().includes(q)
    );
  }, [query, participants]);

  // Handle query input change directly
  const handleQueryChange = (val: string) => {
    setQuery(val);
    setIsOpen(val.trim().length >= 1);
    setHighlightIndex(-1);
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[highlightIndex]) {
        items[highlightIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex]);

  const handleSelect = useCallback(
    (participant: MasterParticipant) => {
      setQuery(participant['NAMA LENGKAP']);
      setIsOpen(false);
      onSelect(participant);
    },
    [onSelect]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : filtered.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex >= 0 && filtered[highlightIndex]) {
          handleSelect(filtered[highlightIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightIndex(-1);
        break;
    }
  };

  // Highlight matched substring
  const highlightMatch = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;
    const idx = text.toLowerCase().indexOf(searchQuery.toLowerCase().trim());
    if (idx === -1) return text;

    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + searchQuery.trim().length);
    const after = text.slice(idx + searchQuery.trim().length);

    return (
      <>
        {before}
        <span className="search-highlight">{match}</span>
        {after}
      </>
    );
  };

  return (
    <div className="name-search-container" ref={containerRef}>
      <label htmlFor="name-search-input" className="field-label">
        Cari Nama Kamu
      </label>
      <div className="search-input-wrapper">
        <svg
          className="search-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          id="name-search-input"
          type="text"
          className="search-input"
          placeholder="Ketik nama untuk mencari..."
          value={query ?? ''}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (filtered.length > 0) setIsOpen(true);
          }}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="name-search-listbox"
          aria-activedescendant={
            highlightIndex >= 0
              ? `name-option-${highlightIndex}`
              : undefined
          }
        />
        {query && !disabled && (
          <button
            type="button"
            className="search-clear"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            aria-label="Hapus pencarian"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && filtered.length > 0 && (
        <ul
          ref={listRef}
          id="name-search-listbox"
          className="search-dropdown"
          role="listbox"
        >
          {filtered.slice(0, 50).map((participant, index) => (
            <li
              key={`${participant['NAMA LENGKAP']}-${index}`}
              id={`name-option-${index}`}
              className={`search-dropdown-item ${
                index === highlightIndex ? 'highlighted' : ''
              }`}
              role="option"
              aria-selected={index === highlightIndex}
              onClick={() => handleSelect(participant)}
              onMouseEnter={() => setHighlightIndex(index)}
            >
              <div className="dropdown-item-name">
                {highlightMatch(participant['NAMA LENGKAP'], query)}
              </div>
              {participant['PRODI'] && (
                <div className="dropdown-item-detail">
                  {participant['PRODI']}
                  {participant['KELOMPOK']
                    ? ` · Kel. ${participant['KELOMPOK']}`
                    : ''}
                </div>
              )}
            </li>
          ))}
          {filtered.length > 50 && (
            <li className="search-dropdown-more">
              +{filtered.length - 50} nama lainnya, ketik lebih spesifik...
            </li>
          )}
          <li
            className="search-dropdown-item search-dropdown-skip"
            onClick={() => {
              setIsOpen(false);
              onSkip(query.trim());
            }}
          >
            <div className="dropdown-item-name skip-item-text">
              ➕ Nama kamu tidak ada di daftar? Lanjut isi manual &quot;{query}&quot; →
            </div>
          </li>
        </ul>
      )}

      {/* Manual entry option — ONLY shown when user has typed a query and no matching names are found */}
      {query.trim().length >= 1 && filtered.length === 0 && (
        <div className="search-skip-section fade-in">
          <div className="no-results-card">
            <p className="search-no-results">
              Tidak ada nama yang cocok dengan <strong>&quot;{query}&quot;</strong> di daftar rekap FST
            </p>
            <button
              type="button"
              className="btn-skip"
              onClick={() => onSkip(query.trim())}
              disabled={disabled}
            >
              Lanjut isi data manual dengan nama ini →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
