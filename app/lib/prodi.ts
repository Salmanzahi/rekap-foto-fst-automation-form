// ============================================
// PRODI (PROGRAM STUDI) UTILITIES & FUZZY MATCHING
// ============================================

export const DEFAULT_PRODI_LIST = [
  'MATEMATIKA',
  'FISIKA',
  'KIMIA',
  'BIOLOGI',
  'STATISTIKA',
  'TEKNIK LINGKUNGAN',
  'TEKNIK BIOMEDIS',
  'SISTEM INFORMASI',
] as const;

export type StandardProdi = typeof DEFAULT_PRODI_LIST[number];

// Alias / Acronym / Common Nickname Mappings for Fuzzy Search
export const PRODI_ALIASES: Record<string, string[]> = {
  'SISTEM INFORMASI': [
    'sisfor',
    'si',
    'sistem informasi',
    'sisteminformasi',
    'sysinfo',
    'sifo',
    'sistem info',
    'informasi',
    'sistem',
  ],
  'TEKNIK LINGKUNGAN': [
    'tekling',
    'tl',
    'teknik lingkungan',
    'tekniklingkungan',
    'lingkungan',
    'tek ling',
    't lingkungan',
    't. lingkungan',
  ],
  'TEKNIK BIOMEDIS': [
    'biomedis',
    'tb',
    'tekbio',
    'teknik biomedis',
    'teknikbiomedis',
    'biomed',
    't biomedis',
    't. biomedis',
  ],
  'MATEMATIKA': [
    'matematika',
    'mtk',
    'math',
    'matematik',
    'mat',
  ],
  'FISIKA': [
    'fisika',
    'fis',
    'physics',
  ],
  'KIMIA': [
    'kimia',
    'kim',
    'chem',
    'chemistry',
  ],
  'BIOLOGI': [
    'biologi',
    'bio',
    'biology',
  ],
  'STATISTIKA': [
    'statistika',
    'stat',
    'statistik',
    'stats',
    'statistics',
  ],
};

/**
 * Normalizes any string input (e.g. "sisfor", "tekling", "sistem informasi")
 * to the canonical UPPERCASE Prodi name (e.g. "SISTEM INFORMASI").
 */
export function normalizeProdi(input: string, customList?: string[]): string {
  if (!input || !input.trim()) return '';

  const clean = input.toLowerCase().trim();
  const prodis = customList && customList.length > 0
    ? Array.from(new Set([...DEFAULT_PRODI_LIST, ...customList.map(p => p.toUpperCase().trim())]))
    : Array.from(DEFAULT_PRODI_LIST);

  // 1. Direct match with uppercase prodis
  for (const p of prodis) {
    if (p.toLowerCase() === clean) {
      return p;
    }
  }

  // 2. Alias match
  for (const [canonical, aliases] of Object.entries(PRODI_ALIASES)) {
    if (aliases.some(alias => alias.toLowerCase() === clean)) {
      return canonical;
    }
  }

  // 3. Substring match against canonical or aliases
  for (const [canonical, aliases] of Object.entries(PRODI_ALIASES)) {
    if (
      canonical.toLowerCase().includes(clean) ||
      aliases.some(alias => alias.toLowerCase().includes(clean))
    ) {
      return canonical;
    }
  }

  // Fallback: return trimmed uppercase
  return input.toUpperCase().trim();
}

/**
 * Calculates match score between search query and a prodi option.
 * Returns numeric score (0 to 100).
 */
function getMatchScore(prodi: string, query: string): number {
  const cleanQ = query.toLowerCase().trim();
  const cleanP = prodi.toLowerCase().trim();

  if (!cleanQ) return 100;

  // Exact match
  if (cleanP === cleanQ) return 100;

  // Alias match check
  const aliases = PRODI_ALIASES[prodi] || [];
  for (const alias of aliases) {
    const cleanAlias = alias.toLowerCase();
    if (cleanAlias === cleanQ) return 98;
    if (cleanAlias.startsWith(cleanQ)) return 92;
    if (cleanAlias.includes(cleanQ)) return 85;
  }

  // Acronym match (e.g., "TL" -> "Teknik Lingkungan")
  const initials = prodi
    .split(/\s+/)
    .map(w => w[0]?.toLowerCase() || '')
    .join('');
  if (initials === cleanQ) return 90;

  // Prodi name starts with query
  if (cleanP.startsWith(cleanQ)) return 88;

  // Prodi name contains query
  if (cleanP.includes(cleanQ)) return 75;

  // Substring match by words
  const words = cleanP.split(/\s+/);
  if (words.some(w => w.startsWith(cleanQ))) return 70;

  return 0;
}

/**
 * Searches and ranks prodi options based on query.
 * Always returns UPPERCASE prodi strings.
 */
export function searchProdi(query: string, customList?: string[]): string[] {
  const prodis = customList && customList.length > 0
    ? Array.from(new Set([...DEFAULT_PRODI_LIST, ...customList.map(p => p.toUpperCase().trim())]))
    : Array.from(DEFAULT_PRODI_LIST);

  if (!query || !query.trim()) {
    return prodis;
  }

  const scored = prodis
    .map(p => ({ prodi: p, score: getMatchScore(p, query) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map(item => item.prodi);
}
