import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

const financeSource = readSource('app/actions/finance.ts');
const financePageSource = readSource('app/w/[buildingId]/(subpages)/financials/page.tsx');
const financeClientSource = readSource('app/w/[buildingId]/(subpages)/financials/financials-client.tsx');
const dashboardSource = readSource('components/dashboard-client.tsx');

function functionBody(name: string, nextMarker: string): string {
  const start = financeSource.indexOf(`export async function ${name}`);
  const end = financeSource.indexOf(nextMarker, start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return financeSource.slice(start, end);
}

describe('finance workspace contract invariants', () => {
  it('maps workspace inputs to the physical legacy building and enforces operation capabilities', () => {
    expect(financeSource).toContain("requireWorkspaceCapability(input.buildingId, 'finance.write')");
    expect(financeSource).toContain("requireWorkspaceCapability(input.workspaceId, 'finance.write')");
    expect(financeSource).toContain("requireWorkspaceCapability(workspaceId, 'finance.workspace.read')");
    expect(financeSource).toContain("requireWorkspaceCapability(workspaceId, 'finance.export')");
    expect(financeSource).toContain("requireWorkspaceCapability(workspaceId, 'finance.unit.read')");
    expect(financeSource).toContain(".eq('building_id', context.primaryBuildingId)");
    expect(financeSource).not.toContain(".eq('building_id', input.buildingId)");
    expect(financeSource).not.toContain(".eq('building_id', workspaceId)");
    expect(financeSource).not.toContain("from '@/lib/supabase/server'");
    expect(financeSource).not.toContain('.auth.getUser()');
  });

  it('blocks cross-workspace unit reads and payments before touching finance entries', () => {
    const paymentBody = functionBody('recordPayment', '// ─── 3.');
    const historyBody = financeSource.slice(
      financeSource.indexOf('export async function getUnitFinanceHistory'),
    );

    expect(paymentBody).toContain('assertUnitInWorkspace(input.unitId, input.workspaceId)');
    expect(paymentBody.indexOf('assertUnitInWorkspace')).toBeLessThan(
      paymentBody.indexOf(".from('finance_entries')"),
    );
    expect(historyBody).toContain("hasWorkspaceCapability(context, 'finance.workspace.read')");
    expect(historyBody).toContain("requireWorkspaceCapability(workspaceId, 'finance.unit.read')");
    expect(historyBody).toContain("requireUnitAccess(workspaceId, unitId, 'finance.workspace.read')");
    expect(historyBody).toContain('assertUnitInWorkspace(unitId, workspaceId)');
    expect(historyBody.indexOf('assertUnitInWorkspace')).toBeLessThan(
      historyBody.indexOf(".from('finance_entries')"),
    );
  });

  it('returns the generic authorization message rather than revealing foreign object existence', () => {
    expect(financeSource.match(/authorizationMessage\(error\)/g)?.length).toBe(6);
    expect(financeSource).toContain("return { success: false, error: 'A művelet nem engedélyezett.' }");
    expect(financeSource).not.toContain("error: 'Albetét nem található'");
    expect(financeSource).not.toContain("error: 'Épület nem található'");
  });

  it('passes workspace identity through every changed direct caller', () => {
    expect(financePageSource).toContain('getFinancialSummary(workspaceId)');
    expect(financePageSource).toContain('getArrearsReport(workspaceId)');
    expect(financeClientSource).toContain('getUnitFinanceHistory(workspaceId, unitId)');
    expect(financeClientSource).toContain('<ResidentView workspaceId={buildingId} unitId={unitId} />');
    expect(dashboardSource).toMatch(
      /recordPaymentAction\(\{\s*workspaceId: data\.buildingId \?\? ''/,
    );
  });
});
