'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { searchProdi, normalizeProdi } from '../lib/prodi';

interface ProdiSelectProps {
  value: string;
  onChange: (normalizedValue: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  placeholder?: string;
  customProdiList?: string[];
}

export default function ProdiSelect({
  value,
  onChange,
  disabled,
  hasError,
  placeholder = 'Pilih atau ketik Prodi (misal: sisfor, tekling)...',
  customProdiList,
}: ProdiSelectProps) {
  const [query, setQuery] = useState(value ? normalizeProdi(value, customProdiList) : '');
  const [prevValue, setPrevValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value with local query state during render when props change
  if (value !== prevValue) {
    setPrevValue(value);
    setQuery(value ? normalizeProdi(value, customProdiList) : '');
  }

  // Derive filtered prodi options dynamically via useMemo without useEffect setState
  const filteredProdis = useMemo(() => {
    const normalizedVal = value ? normalizeProdi(value, customProdiList) : '';
    const searchQuery = (normalizedVal && query === normalizedVal) ? '' : query;
    return searchProdi(searchQuery, customProdiList);
  }, [query, value, customProdiList]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIdx >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[highlightIdx]) {
        (items[highlightIdx] as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIdx]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (query.trim()) {
          const normalized = normalizeProdi(query, customProdiList);
          setQuery(normalized);
          onChange(normalized);
        } else {
          onChange('');
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [query, onChange, customProdiList]);

  const handleSelect = (selectedProdi: string) => {
    const normalized = normalizeProdi(selectedProdi, customProdiList);
    setQuery(normalized);
    onChange(normalized);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    onChange('');
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIdx(prev => (prev < filteredProdis.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIdx(prev => (prev > 0 ? prev - 1 : filteredProdis.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIdx >= 0 && filteredProdis[highlightIdx]) {
          handleSelect(filteredProdis[highlightIdx]);
        } else if (filteredProdis.length > 0) {
          handleSelect(filteredProdis[0]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className="prodi-select-container" ref={containerRef}>
      <div className="prodi-input-wrapper">
        <input
          ref={inputRef}
          id="field-Prodi"
          type="text"
          className={`form-input prodi-input ${hasError ? 'field-error' : ''}`}
          placeholder={placeholder}
          value={query ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            setIsOpen(true);
            setHighlightIdx(-1);
            const normalized = val ? normalizeProdi(val, customProdiList) : '';
            onChange(normalized);
          }}
          onFocus={() => {
            setIsOpen(true);
            inputRef.current?.select();
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="prodi-dropdown-listbox"
        />
        <div className="prodi-actions-right">
          {query && !disabled && (
            <button
              type="button"
              className="prodi-clear-btn"
              onClick={handleClear}
              tabIndex={-1}
              aria-label="Hapus pilihan Prodi"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
          <button
            type="button"
            className="prodi-dropdown-toggle"
            onClick={() => setIsOpen(prev => !prev)}
            tabIndex={-1}
            disabled={disabled}
            aria-label="Buka pilihan Prodi"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="16"
              height="16"
              className={`prodi-chevron ${isOpen ? 'open' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      {isOpen && filteredProdis.length > 0 && (
        <ul
          ref={listRef}
          id="prodi-dropdown-listbox"
          className="search-dropdown prodi-dropdown"
          role="listbox"
        >
          {filteredProdis.map((prodi, idx) => {
            const isSelected = prodi === value;
            return (
              <li
                key={prodi}
                className={`search-dropdown-item prodi-item ${idx === highlightIdx ? 'highlighted' : ''} ${isSelected ? 'selected' : ''}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(prodi)}
                onMouseEnter={() => setHighlightIdx(idx)}
              >
                <div className="prodi-item-row">
                  <span className="dropdown-item-name prodi-item-name">{prodi}</span>
                  {isSelected && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16" className="prodi-check-icon">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
