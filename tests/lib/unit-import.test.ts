import { describe, expect, it } from 'vitest';
import { parseWorkspaceUnitCsv } from '@/lib/unit-import';

describe('parseWorkspaceUnitCsv', () => {
  it('parses Hungarian semicolon-delimited rows and parent relationships', () => {
    const result = parseWorkspaceUnitCsv([
      'megnevezés;kategória;fő albetét',
      'A/1;lakás;',
      '"A/1; tároló";tároló;A/1',
    ].join('\r\n'));

    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      { rowNumber: 2, designation: 'A/1', unitCategory: 'APARTMENT', parentDesignation: null },
      { rowNumber: 3, designation: 'A/1; tároló', unitCategory: 'STORAGE', parentDesignation: 'A/1' },
    ]);
  });

  it('parses comma-delimited CSV and escaped quotes', () => {
    const result = parseWorkspaceUnitCsv([
      'designation,unit_category,parent_designation',
      '"Shop ""A""",COMMERCIAL,',
    ].join('\n'));

    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toEqual({
      rowNumber: 2,
      designation: 'Shop "A"',
      unitCategory: 'COMMERCIAL',
      parentDesignation: null,
    });
  });

  it('returns deterministic header errors without guessing column positions', () => {
    const result = parseWorkspaceUnitCsv('foo;bar\nA/1;lakás');
    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual(['DESIGNATION_HEADER_MISSING', 'CATEGORY_HEADER_MISSING']);
  });

  it('enforces the 500-row client boundary', () => {
    const data = Array.from({ length: 501 }, (_, index) => `A/${index + 1};APARTMENT;`);
    const result = parseWorkspaceUnitCsv(['designation;unit_category;parent_designation', ...data].join('\n'));
    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual(['ROW_LIMIT_EXCEEDED']);
  });

  it('keeps unknown categories for authoritative server-side row validation', () => {
    const result = parseWorkspaceUnitCsv('designation;unit_category\nA/1;PENTHOUSE');
    expect(result.errors).toEqual([]);
    expect(result.rows[0]?.unitCategory).toBe('PENTHOUSE');
  });

  it('rejects an unterminated quoted field instead of silently merging rows', () => {
    const result = parseWorkspaceUnitCsv('designation;unit_category\n"A/1;APARTMENT');
    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual(['UNTERMINATED_QUOTE']);
  });
});
