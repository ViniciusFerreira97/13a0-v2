// Cores reais de uniforme por clube — usadas para o "escudo fictício estilizado" (cores + ano,
// nunca o escudo real, ver §11 do planejamento). Curadoria manual: a planilha-fonte não traz
// essa informação. Cobre os 27 clubes campeões presentes no dataset atual.

export interface ClubColors {
  primary: string;
  secondary: string;
}

const DEFAULT_COLORS: ClubColors = { primary: '#0e7a41', secondary: '#ffffff' };

const CLUB_COLORS: Record<string, ClubColors> = {
  'Argentinos Jrs': { primary: '#E30613', secondary: '#ffffff' },
  'Atl. Nacional': { primary: '#006633', secondary: '#ffffff' },
  'Atlético-MG': { primary: '#000000', secondary: '#ffffff' },
  'Boca Juniors': { primary: '#003DA5', secondary: '#FFD100' },
  Botafogo: { primary: '#000000', secondary: '#ffffff' },
  'Colo-Colo': { primary: '#111111', secondary: '#ffffff' },
  Corinthians: { primary: '#000000', secondary: '#ffffff' },
  Cruzeiro: { primary: '#003399', secondary: '#ffffff' },
  Estudiantes: { primary: '#D2001C', secondary: '#ffffff' },
  Flamengo: { primary: '#D2122E', secondary: '#000000' },
  Fluminense: { primary: '#7A1E3D', secondary: '#1E7145' },
  Grêmio: { primary: '#0038A8', secondary: '#000000' },
  Independiente: { primary: '#E2001A', secondary: '#ffffff' },
  Internacional: { primary: '#D2122E', secondary: '#ffffff' },
  'LDU Quito': { primary: '#FFD400', secondary: '#003DA5' },
  Nacional: { primary: '#002D62', secondary: '#ffffff' },
  Olimpia: { primary: '#000000', secondary: '#ffffff' },
  'Once Caldas': { primary: '#C8102E', secondary: '#ffffff' },
  Palmeiras: { primary: '#006633', secondary: '#ffffff' },
  Peñarol: { primary: '#FFD100', secondary: '#000000' },
  Racing: { primary: '#6FC7EB', secondary: '#ffffff' },
  'River Plate': { primary: '#D91A2A', secondary: '#ffffff' },
  'San Lorenzo': { primary: '#003DA5', secondary: '#E2001A' },
  Santos: { primary: '#111111', secondary: '#ffffff' },
  'São Paulo': { primary: '#C10019', secondary: '#000000' },
  'Vasco da Gama': { primary: '#111111', secondary: '#ffffff' },
  'Vélez Sársfield': { primary: '#002E6D', secondary: '#E2001A' },
};

export function getClubColors(club: string): ClubColors {
  return CLUB_COLORS[club] ?? DEFAULT_COLORS;
}

/** Iniciais para o "escudo" tipográfico (nunca o escudo real, §11). */
export function clubInitials(club: string): string {
  const words = club.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
}

function relativeLuminance(hex: string): number {
  const c = hex.replace('#', '');
  const [r, g, b] = [c.slice(0, 2), c.slice(2, 4), c.slice(4, 6)].map((h) => parseInt(h, 16) / 255);
  const [rl, gl, bl] = [r, g, b].map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/** Preto ou branco, o que tiver mais contraste contra a cor de fundo dada. */
export function getContrastText(hex: string): string {
  return relativeLuminance(hex) > 0.5 ? '#14171a' : '#ffffff';
}
