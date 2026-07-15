// Lê Libertadores_Campeoes.xlsx (fonte privada, nunca distribuída no cliente) e gera
// public/data/dataset.json — o dataset "editions/players/coaches" consumido pelo app (§3, §8.1).
//
// Layout confirmado da planilha:
//   Sheet "Campeões (índice)": header na linha 2, dados nas linhas 3–68.
//   66 sheets "<Clube> <Ano>": header na linha 4, dados a partir da linha 5, terminando em
//     uma linha "COMISSÃO TÉCNICA" (seção) + 1 linha de técnico (D="Técnico") + rodapé livre.
//   "—" (travessão) marca atributo não aplicável (não é zero). "*" em Nº marca número provisório.

import ExcelJS from 'exceljs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type {
  Coach,
  Edition,
  GoalkeeperAttributes,
  OutfieldAttributes,
  Player,
  Position,
  SeedDataset,
} from '../src/engine/types.js';
import { joinNameParts } from '../src/engine/naming.js';

const SOURCE_XLSX = resolve(import.meta.dirname, '..', 'Libertadores_Campeoes.xlsx');
const OUTPUT_JSON = resolve(import.meta.dirname, '..', 'public', 'data', 'dataset.json');

const KNOWN_POSITIONS = new Set<Position>([
  'GK', 'LD', 'ZAG', 'LE', 'VOL', 'MC', 'MEI', 'MD', 'ME', 'PD', 'PE', 'SA', 'CA',
]);

function slug(...parts: (string | number)[]): string {
  return parts
    .join('-')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function cellText(cell: ExcelJS.Cell | undefined): string | null {
  const v = cell?.value;
  if (v == null) return null;
  const s = (typeof v === 'object' && 'richText' in v ? (v as any).richText.map((r: any) => r.text).join('') : String(v)).trim();
  if (s === '' || s === '—') return null;
  return s;
}

function cellNumber(cell: ExcelJS.Cell | undefined): number | null {
  const t = cellText(cell);
  if (t == null) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function parsePosition(raw: string): Position {
  const primary = raw.split('/')[0].trim() as Position;
  if (!KNOWN_POSITIONS.has(primary)) {
    throw new Error(`posição desconhecida: "${raw}"`);
  }
  return primary;
}

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(SOURCE_XLSX);

  const indexSheet = workbook.getWorksheet('Campeões (índice)');
  if (!indexSheet) throw new Error('sheet "Campeões (índice)" não encontrada');

  interface IndexRow {
    year: number;
    club: string;
    country: string;
    titleNumber: number;
  }
  // Chave por ano, não por "clube+ano": a aba-índice usa nomes por extenso ("Argentinos
  // Juniors", "Atlético Nacional", "Atlético Mineiro") que não batem com os nomes abreviados
  // usados nas abas de cada time ("Argentinos Jrs", "Atl. Nacional", "Atlético-MG"), o que
  // fazia o lookup falhar silenciosamente e cair no fallback "desconhecido". Ano é único em
  // cada uma das 67 edições (um campeão por ano), então serve como chave confiável.
  const indexByYear = new Map<number, IndexRow>();
  for (let r = 3; r <= indexSheet.rowCount; r++) {
    const row = indexSheet.getRow(r);
    const year = cellNumber(row.getCell(1));
    const club = cellText(row.getCell(3));
    if (year == null || club == null) continue;
    const country = cellText(row.getCell(4)) ?? 'desconhecido';
    const titleNumber = cellNumber(row.getCell(5)) ?? 1;
    indexByYear.set(year, { year, club, country, titleNumber });
  }

  const editions: Edition[] = [];
  const players: Player[] = [];
  const coaches: Coach[] = [];

  for (const sheet of workbook.worksheets) {
    const match = /^(.+?)\s+(\d{4})$/.exec(sheet.name);
    if (!match) continue; // pula "Campeões (índice)" e "Metodologia"
    const [, club, yearStr] = match;
    const year = Number(yearStr);

    const idxRow = indexByYear.get(year);
    const editionId = slug(club, year);
    let coachId = `${editionId}-coach`;

    let playerCount = 0;
    for (let r = 5; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const a = cellText(row.getCell(1));
      const b = cellText(row.getCell(2));
      const d = cellText(row.getCell(4));

      if (!a && !d) continue; // linha em branco (espaçador)
      if (a === 'COMISSÃO TÉCNICA') continue; // cabeçalho de seção

      const name = joinNameParts(a, b);

      if (d === 'Técnico') {
        coaches.push({
          id: coachId,
          name,
          nationality: cellText(row.getCell(5)) ?? 'desconhecido',
          star: cellText(row.getCell(6)) === '★',
          overall: cellNumber(row.getCell(7)) ?? 75,
          // A planilha não registra estilo tático — atribuído como "equilibrado" por padrão;
          // curadoria manual entra depois (§6, metagame de técnicos).
          naturalStyle: 'equilibrado',
        });
        continue;
      }

      if (!d || !KNOWN_POSITIONS.has(d.split('/')[0].trim() as Position)) {
        // linha de rodapé (texto livre) — fim dos dados desta aba
        break;
      }

      const position = parsePosition(d);
      const shirtRaw = cellText(row.getCell(3));
      const numberOfficial = shirtRaw != null && !shirtRaw.endsWith('*');
      const shirtNumber = shirtRaw != null ? Number(shirtRaw.replace('*', '')) : null;

      const att: OutfieldAttributes | GoalkeeperAttributes =
        position === 'GK'
          ? {
              posicionamento: cellNumber(row.getCell(16)) ?? 50,
              reflexo: cellNumber(row.getCell(17)) ?? 50,
              saida: cellNumber(row.getCell(18)) ?? 50,
              pes: cellNumber(row.getCell(19)) ?? 50,
              penalti: cellNumber(row.getCell(20)) ?? 50,
            }
          : {
              marcacao: cellNumber(row.getCell(8)) ?? 50,
              passe: cellNumber(row.getCell(9)) ?? 50,
              velocidade: cellNumber(row.getCell(10)) ?? 50,
              cruzamento: cellNumber(row.getCell(11)) ?? 50,
              drible: cellNumber(row.getCell(12)) ?? 50,
              cabeceio: cellNumber(row.getCell(13)) ?? 50,
              finalizacao: cellNumber(row.getCell(14)) ?? 50,
              desarme: cellNumber(row.getCell(15)) ?? 50,
            };

      players.push({
        id: slug(editionId, name, playerCount),
        editionId,
        name,
        firstName: a ?? '',
        lastName: b ?? '',
        shirtNumber: Number.isFinite(shirtNumber) ? shirtNumber : null,
        numberOfficial,
        position,
        nationality: cellText(row.getCell(5)) ?? 'desconhecido',
        star: cellText(row.getCell(6)) === '★',
        clutch: false, // curadoria manual futura (§3: heróis de final)
        overall: cellNumber(row.getCell(7)) ?? 70,
        att,
      });
      playerCount++;
    }

    editions.push({
      id: editionId,
      year,
      club,
      country: idxRow?.country ?? 'desconhecido',
      coachId,
      titleNumber: idxRow?.titleNumber ?? 1,
      flavorText: undefined, // curadoria manual futura (§3)
      // Registro pré-2000 é declaradamente irregular na planilha-fonte (aba Metodologia).
      provisional: year < 2000,
    });
  }

  editions.sort((a, b) => a.year - b.year);

  const dataset: SeedDataset = { editions, players, coaches };

  mkdirSync(dirname(OUTPUT_JSON), { recursive: true });
  writeFileSync(OUTPUT_JSON, JSON.stringify(dataset));

  console.log(`${editions.length} elencos, ${players.length} jogadores, ${coaches.length} técnicos`);
  console.log(`→ ${OUTPUT_JSON}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
