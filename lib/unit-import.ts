export type UnitImportCategory = 'APARTMENT' | 'GARAGE' | 'STORAGE' | 'COMMERCIAL' | 'OTHER';

export interface ParsedWorkspaceUnitImportRow {
  rowNumber: number;
  designation: string;
  unitCategory: string;
  parentDesignation: string | null;
}

export interface WorkspaceUnitCsvParseResult {
  rows: ParsedWorkspaceUnitImportRow[];
  errors: string[];
}

const MAX_IMPORT_ROWS = 500;

const HEADER_ALIASES = {
  designation: new Set(['designation', 'megnevezes', 'albetet', 'unit', 'unit_designation']),
  category: new Set(['unit_category', 'category', 'kategoria', 'tipus', 'unit_type']),
  parent: new Set(['parent_designation', 'parent', 'fo_albetet', 'kapcsolt_fo_albetet']),
};

const CATEGORY_ALIASES: Record<string, UnitImportCategory> = {
  APARTMENT: 'APARTMENT',
  LAKAS: 'APARTMENT',
  GARAGE: 'GARAGE',
  GARAZS: 'GARAGE',
  TEREMGARAZS: 'GARAGE',
  TEREMGARAZSHELY: 'GARAGE',
  STORAGE: 'STORAGE',
  TAROLO: 'STORAGE',
  COMMERCIAL: 'COMMERCIAL',
  UZLET: 'COMMERCIAL',
  UZLETHELYISEG: 'COMMERCIAL',
  OTHER: 'OTHER',
  EGYEB: 'OTHER',
};

function normalizedToken(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function normalizedCategory(value: string): string {
  const token = normalizedToken(value).replace(/_/g, '').toUpperCase();
  return CATEGORY_ALIASES[token] ?? value.trim().toUpperCase();
}

function delimiterForHeader(value: string): ',' | ';' {
  let commaCount = 0;
  let semicolonCount = 0;
  let quoted = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '"') {
      if (quoted && value[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (!quoted && character === ',') commaCount += 1;
    else if (!quoted && character === ';') semicolonCount += 1;
    else if (!quoted && (character === '\n' || character === '\r')) break;
  }

  return semicolonCount > commaCount ? ';' : ',';
}

function parseDelimitedRows(value: string, delimiter: ',' | ';'): { rows: string[][]; unterminatedQuote: boolean } {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '"') {
      if (quoted && value[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (!quoted && character === delimiter) {
      row.push(cell.trim());
      cell = '';
      continue;
    }
    if (!quoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && value[index + 1] === '\n') index += 1;
      row.push(cell.trim());
      if (row.some((entry) => entry.length > 0)) rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += character;
  }

  row.push(cell.trim());
  if (row.some((entry) => entry.length > 0)) rows.push(row);
  return { rows, unterminatedQuote: quoted };
}

function findHeaderIndex(headers: string[], aliases: Set<string>): number {
  return headers.findIndex((header) => aliases.has(header));
}

export function parseWorkspaceUnitCsv(value: string): WorkspaceUnitCsvParseResult {
  const source = value.replace(/^\uFEFF/, '').trim();
  if (!source) return { rows: [], errors: ['EMPTY_FILE'] };

  const parsed = parseDelimitedRows(source, delimiterForHeader(source));
  if (parsed.unterminatedQuote) return { rows: [], errors: ['UNTERMINATED_QUOTE'] };
  const parsedRows = parsed.rows;
  if (parsedRows.length < 2) return { rows: [], errors: ['NO_DATA_ROWS'] };

  const headers = parsedRows[0].map(normalizedToken);
  const designationIndex = findHeaderIndex(headers, HEADER_ALIASES.designation);
  const categoryIndex = findHeaderIndex(headers, HEADER_ALIASES.category);
  const parentIndex = findHeaderIndex(headers, HEADER_ALIASES.parent);
  const errors: string[] = [];

  if (designationIndex < 0) errors.push('DESIGNATION_HEADER_MISSING');
  if (categoryIndex < 0) errors.push('CATEGORY_HEADER_MISSING');
  if (errors.length) return { rows: [], errors };

  const dataRows = parsedRows.slice(1);
  if (dataRows.length > MAX_IMPORT_ROWS) return { rows: [], errors: ['ROW_LIMIT_EXCEEDED'] };

  return {
    rows: dataRows.map((cells, index) => ({
      rowNumber: index + 2,
      designation: cells[designationIndex]?.trim() ?? '',
      unitCategory: normalizedCategory(cells[categoryIndex] ?? ''),
      parentDesignation: parentIndex >= 0 && cells[parentIndex]?.trim()
        ? cells[parentIndex].trim()
        : null,
    })),
    errors: [],
  };
}
