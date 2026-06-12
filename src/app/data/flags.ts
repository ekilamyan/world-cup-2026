// Maps each World Cup team name (as it appears in the pool data) to an ISO
// 3166-1 alpha-2 country code (plus GB subdivisions for England/Scotland),
// used to build flag image URLs from flagcdn.com.

const CODES: Record<string, string> = {
  mexico: 'mx',
  'south africa': 'za',
  'south korea': 'kr',
  'czech republic': 'cz',
  canada: 'ca',
  bosnia: 'ba',
  qatar: 'qa',
  switzerland: 'ch',
  brazil: 'br',
  morocco: 'ma',
  haiti: 'ht',
  scotland: 'gb-sct',
  usa: 'us',
  'united states': 'us',
  paraguay: 'py',
  australia: 'au',
  turkey: 'tr',
  germany: 'de',
  curacao: 'cw',
  'ivory coast': 'ci',
  ecuador: 'ec',
  netherlands: 'nl',
  japan: 'jp',
  sweden: 'se',
  tunisia: 'tn',
  iran: 'ir',
  'new zealand': 'nz',
  belgium: 'be',
  egypt: 'eg',
  spain: 'es',
  'cape verde': 'cv',
  'saudi arabia': 'sa',
  uruguay: 'uy',
  france: 'fr',
  senegal: 'sn',
  iraq: 'iq',
  norway: 'no',
  argentina: 'ar',
  algeria: 'dz',
  austria: 'at',
  jordan: 'jo',
  portugal: 'pt',
  'dr congo': 'cd',
  uzbekistan: 'uz',
  colombia: 'co',
  england: 'gb-eng',
  croatia: 'hr',
  ghana: 'gh',
  panama: 'pa',
};

function norm(s: string): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** ISO code for a team name, or '' if unknown (e.g. "Draw", "", TBD). */
export function flagCode(team: string): string {
  return CODES[norm(team)] ?? '';
}
