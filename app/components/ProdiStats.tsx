'use client';

import { useState } from 'react';
import type { MasterParticipant } from '../lib/config';
import type { StatsResponse } from '../lib/api';
import { DEFAULT_PRODI_LIST, normalizeProdi } from '../lib/prodi';

interface ProdiStatsProps {
  participants: MasterParticipant[];
  stats: StatsResponse | null;
}

const PRODI_SHORT: Record<string, string> = {
  'SISTEM INFORMASI':  'Sisfor',
  'TEKNIK LINGKUNGAN': 'Tekling',
  'TEKNIK BIOMEDIS':   'Biomedis',
  'MATEMATIKA':        'Matematika',
  'FISIKA':            'Fisika',
  'KIMIA':             'Kimia',
  'BIOLOGI':           'Biologi',
  'STATISTIKA':        'Statistika',
};

const TARGET_TOTAL_FST = 80;
const TARGET_PER_PRODI = 10;

export default function ProdiStats({ participants, stats }: ProdiStatsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalMaster       = participants.length;
  const totalSubmissions  = stats?.totalSubmissions  || 0;
  const totalFotoBareng   = stats?.totalFotoBareng   || 0;
  const sisaTarget        = Math.max(0, TARGET_TOTAL_FST - totalFotoBareng);
  const pctOverall        = Math.min(100, Math.round((totalFotoBareng / TARGET_TOTAL_FST) * 100));

  const prodiDetails = DEFAULT_PRODI_LIST.map((prodi) => {
    const masterCount = participants.filter(
      (p) => normalizeProdi(p['PRODI']) === prodi
    ).length;

    let submitted   = 0;
    let fotoBareng  = 0;

    if (stats?.prodiStats) {
      Object.entries(stats.prodiStats).forEach(([key, val]) => {
        if (normalizeProdi(key) === prodi) {
          submitted  += val.submitted  || 0;
          fotoBareng += val.fotoBareng || 0;
        }
      });
    }

    const pct       = Math.min(100, Math.round((fotoBareng / TARGET_PER_PRODI) * 100));
    const sisa      = Math.max(0, TARGET_PER_PRODI - fotoBareng);
    const reached   = fotoBareng >= TARGET_PER_PRODI;

    return { name: prodi, masterCount, submitted, fotoBareng, pct, sisa, reached };
  });

  return (
    <div className="ps-root">

      {/* ── Banner progress total ── */}
      <div className="ps-banner">
        <div className="ps-banner-left">
          <span className="ps-banner-num">{totalFotoBareng}</span>
          <span className="ps-banner-denom">/{TARGET_TOTAL_FST}</span>
          <span className="ps-banner-label">foto bareng</span>
        </div>
        <div className="ps-banner-right">
          <div className="ps-bar-track">
            <div className="ps-bar-fill" style={{ width: `${pctOverall}%` }} />
          </div>
          <span className="ps-banner-pct">{pctOverall}% target FST</span>
        </div>
      </div>

      {/* ── 3 angka kecil ── */}
      <div className="ps-trio">
        <div className="ps-trio-item">
          <span className="ps-trio-num">{totalFotoBareng}</span>
          <span className="ps-trio-lbl">sudah foto</span>
        </div>
        <div className="ps-trio-divider" />
        <div className="ps-trio-item">
          <span className="ps-trio-num">{totalSubmissions}</span>
          <span className="ps-trio-lbl">isi form</span>
        </div>
        <div className="ps-trio-divider" />
        <div className="ps-trio-item ps-trio-item--warn">
          <span className="ps-trio-num">{sisaTarget}</span>
          <span className="ps-trio-lbl">sisa target</span>
        </div>
      </div>

      {/* ── Toggle per-prodi ── */}
      <button
        type="button"
        className="ps-toggle"
        onClick={() => setIsExpanded(v => !v)}
      >
        <span>Progress per prodi</span>
        <svg
          viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          width="14" height="14"
          className={`ps-chevron${isExpanded ? ' open' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isExpanded && (
        <div className="ps-prodi-list fade-in">
          {prodiDetails.map((item) => (
            <div key={item.name} className={`ps-prodi-row${item.reached ? ' ps-prodi-row--done' : ''}`}>
              <div className="ps-prodi-meta">
                <span className="ps-prodi-name">
                  {PRODI_SHORT[item.name] ?? item.name}
                  {item.reached && <span className="ps-check">✓</span>}
                </span>
                <span className="ps-prodi-count">
                  {item.fotoBareng}<span className="ps-prodi-target">/{TARGET_PER_PRODI}</span>
                </span>
              </div>

              <div className="ps-mini-track">
                <div
                  className={`ps-mini-fill${item.reached ? ' done' : ''}`}
                  style={{ width: `${item.pct}%` }}
                />
              </div>

              {!item.reached && (
                <span className="ps-prodi-sisa">kurang {item.sisa}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
