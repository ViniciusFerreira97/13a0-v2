// Cores reais de uniforme por clube — usadas para o "escudo fictício estilizado" (cores + ano,
// nunca o escudo real, ver §11 do planejamento). Curadoria manual: a planilha-fonte não traz
// essa informação. Cobre os 27 clubes campeões presentes no dataset atual.

export interface ClubColors {
  primary: string;
  secondary: string;
  /** Terceira cor opcional — só alguns clubes (ex.: Colo-Colo) precisam de mais que 2. */
  tertiary?: string;
}

const DEFAULT_COLORS: ClubColors = { primary: '#0e7a41', secondary: '#ffffff' };

const CLUB_COLORS: Record<string, ClubColors> = {
  'Argentinos Jrs': { primary: '#E32021', secondary: '#00569D', tertiary: '#FFFFFF' },
  'Atl. Nacional': { primary: '#00953B', secondary: '#FFFFFF' },
  'Atlético-MG': { primary: '#000000', secondary: '#FFFFFF' },
  'Boca Juniors': { primary: '#182A4E', secondary: '#F9BB31' },
  Botafogo: { primary: '#000000', secondary: '#ffffff' },
  'Colo-Colo': { primary: '#16216A', secondary: '#E31B23', tertiary: '#FFFFFF' },
  Corinthians: { primary: '#000000', secondary: '#ffffff' },
  Cruzeiro: { primary: '#2F529E', secondary: '#FEFEFE' },
  Estudiantes: { primary: '#EC1B23', secondary: '#FEFDFD', tertiary: '#A8976D' },
  Flamengo: { primary: '#C52613', secondary: '#000200', tertiary: '#FFFFFF' },
  Fluminense: { primary: '#92062A', secondary: '#006039', tertiary: '#FFFFFF' },
  Grêmio: { primary: '#0D80BF', secondary: '#1F1A17', tertiary: '#FFFFFF' },
  Independiente: { primary: '#EC1C24', secondary: '#FFFFFF', tertiary: '#000000' },
  Internacional: { primary: '#E5050F', secondary: '#FFFFFF' },
  'LDU Quito': { primary: '#002B78', secondary: '#E31B23', tertiary: '#FFFFFF' },
  Nacional: { primary: '#1A4E9A', secondary: '#FFFFFF', tertiary: '#681215' },
  Olimpia: { primary: '#000000', secondary: '#ffffff' },
  'Once Caldas': { primary: '#008000', secondary: '#E31B23', tertiary: '#003366' },
  Palmeiras: { primary: '#006437', secondary: '#FFFFFF' },
  Peñarol: { primary: '#FFC20E', secondary: '#000000' },
  Racing: { primary: '#029CDC', secondary: '#FFFFFF', tertiary: '#00273E' },
  'River Plate': { primary: '#ED192D', secondary: '#FFFFFF', tertiary: '#231F20' },
  'San Lorenzo': { primary: '#EA202C', secondary: '#263A54', tertiary: '#FEFEFE' },
  Santos: { primary: '#111111', secondary: '#ffffff' },
  'São Paulo': { primary: '#000000', secondary: '#FFFFFF', tertiary: '#FE0000' },
  'Vasco da Gama': { primary: '#111111', secondary: '#ffffff' },
  'Vélez Sársfield': { primary: '#0161A8', secondary: '#FFFFFF' },
};

export function getClubColors(club: string): ClubColors {
  return CLUB_COLORS[club] ?? DEFAULT_COLORS;
}

/** Gradiente CSS com as cores do clube — 2 ou 3 stops, conforme o clube tiver `tertiary` ou não. */
export function getClubGradient(club: string, angle = 135): string {
  const c = getClubColors(club);
  const stops = [c.primary, c.secondary, c.tertiary].filter((x): x is string => !!x);
  return `linear-gradient(${angle}deg, ${stops.join(', ')})`;
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

/**
 * Sombra de texto para usar sobre o gradiente de cores do clube (2-3 stops): a cor de contraste
 * é calculada só a partir de `primary`, mas o gradiente pode passar por um stop claro (branco é
 * comum como 2ª/3ª cor) bem onde o texto cai — nesse ponto o texto "some". A sombra no tom
 * oposto ao do texto garante leitura em qualquer trecho do gradiente, claro ou escuro.
 */
export function getTextShadow(textColor: string): string {
  const shadow = textColor === '#ffffff' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.75)';
  return `0 1px 3px ${shadow}, 0 1px 8px ${shadow}`;
}
