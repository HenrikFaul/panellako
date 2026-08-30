'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileCheck2, FileSpreadsheet, ShieldCheck, Upload } from 'lucide-react';
import {
  applyWorkspaceUnitImport,
  previewWorkspaceUnitImport,
  type WorkspaceUnitImportPreviewRow,
} from '@/app/actions/workspace-admin';
import { parseWorkspaceUnitCsv, type ParsedWorkspaceUnitImportRow } from '@/lib/unit-import';
import { useI18n } from '@/src/i18n/useI18n';

interface WorkspaceUnitBulkImportProps {
  workspaceId: string;
}

type Notice = { tone: 'success' | 'error' | 'info'; message: string; href?: string };

const SAMPLE = 'designation;unit_category;parent_designation\nA/1;APARTMENT;\nA/1 tároló;STORAGE;A/1';

function NoticeBox({ notice, actionLabel }: { notice: Notice | null; actionLabel: string }) {
  if (!notice) return null;
  const colors = notice.tone === 'error'
    ? 'border-rose-200 bg-rose-50 text-rose-900'
    : notice.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : 'border-sky-200 bg-sky-50 text-sky-900';
  return (
    <div role={notice.tone === 'error' ? 'alert' : 'status'} aria-live="polite" className={`rounded-xl border px-3 py-2 text-xs leading-relaxed ${colors}`}>
      <span>{notice.message}</span>
      {notice.href ? (
        <Link href={notice.href as Route} className="ml-2 inline-flex font-semibold underline underline-offset-2">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

function statusClasses(status: WorkspaceUnitImportPreviewRow['status']): string {
  if (status === 'READY' || status === 'IMPORTED') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'CONFLICT') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-rose-200 bg-rose-50 text-rose-900';
}

export default function WorkspaceUnitBulkImport({ workspaceId }: WorkspaceUnitBulkImportProps) {
  const router = useRouter();
  const { t } = useI18n();
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);
  const [source, setSource] = useState(SAMPLE);
  const [rows, setRows] = useState<ParsedWorkspaceUnitImportRow[]>([]);
  const [preview, setPreview] = useState<WorkspaceUnitImportPreviewRow[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [previewPending, setPreviewPending] = useState(false);
  const [applyPending, setApplyPending] = useState(false);
  const draftKey = `panellako:unit-import:${workspaceId}`;

  useEffect(() => {
    const savedDraft = window.sessionStorage.getItem(draftKey);
    if (savedDraft) setSource(savedDraft);
  }, [draftKey]);

  const readyCount = preview.filter((row) => row.status === 'READY').length;
  const issueCount = preview.length - readyCount;
  const canApply = preview.length > 0 && issueCount === 0 && rows.length === preview.length;

  function parserError(code: string): string {
    const keys: Record<string, string> = {
      EMPTY_FILE: 'workspaceAdmin.unitImport.errors.empty',
      NO_DATA_ROWS: 'workspaceAdmin.unitImport.errors.noRows',
      DESIGNATION_HEADER_MISSING: 'workspaceAdmin.unitImport.errors.designationHeader',
      CATEGORY_HEADER_MISSING: 'workspaceAdmin.unitImport.errors.categoryHeader',
      ROW_LIMIT_EXCEEDED: 'workspaceAdmin.unitImport.errors.rowLimit',
      UNTERMINATED_QUOTE: 'workspaceAdmin.unitImport.errors.unterminatedQuote',
    };
    return t(keys[code] ?? 'workspaceAdmin.unitImport.errors.parse');
  }

  function resetPreview(nextSource: string) {
    window.sessionStorage.removeItem(draftKey);
    setSource(nextSource);
    setRows([]);
    setPreview([]);
    setNotice(null);
    attempt.current = null;
  }

  async function loadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 256 * 1024) {
      setNotice({ tone: 'error', message: t('workspaceAdmin.unitImport.errors.fileSize') });
      return;
    }
    try {
      resetPreview(await file.text());
    } catch {
      setNotice({ tone: 'error', message: t('workspaceAdmin.unitImport.errors.fileRead') });
    }
  }

  async function runPreview() {
    setNotice(null);
    setPreview([]);
    attempt.current = null;
    const parsed = parseWorkspaceUnitCsv(source);
    if (parsed.errors.length) {
      setRows([]);
      setNotice({ tone: 'error', message: parsed.errors.map(parserError).join(' ') });
      return;
    }
    setRows(parsed.rows);
    setPreviewPending(true);
    const result = await previewWorkspaceUnitImport({ workspaceId, rows: parsed.rows });
    setPreviewPending(false);
    if (!result.success || !result.data) {
      setNotice({ tone: 'error', message: result.error ?? t('workspaceAdmin.unitImport.previewFailed') });
      return;
    }
    setPreview(result.data.rows);
    const issues = result.data.rows.filter((row) => row.status !== 'READY').length;
    setNotice({
      tone: issues ? 'info' : 'success',
      message: issues
        ? t('workspaceAdmin.unitImport.previewIssues').replace('{count}', String(issues))
        : t('workspaceAdmin.unitImport.previewReady').replace('{count}', String(result.data.rows.length)),
    });
  }

  async function applyImport() {
    if (!canApply) return;
    setNotice(null);
    const fingerprint = JSON.stringify(rows);
    if (!attempt.current || attempt.current.fingerprint !== fingerprint) {
      attempt.current = { fingerprint, key: window.crypto.randomUUID() };
    }
    setApplyPending(true);
    const result = await applyWorkspaceUnitImport({
      workspaceId,
      rows,
      idempotencyKey: attempt.current.key,
    });
    setApplyPending(false);
    if (!result.success || !result.data) {
      if (result.mfaRequired) window.sessionStorage.setItem(draftKey, source);
      setNotice({
        tone: 'error',
        message: result.error ?? t('workspaceAdmin.unitImport.applyFailed'),
        href: result.mfaRequired ? result.stepUpHref : undefined,
      });
      return;
    }
    if (!result.data.applied) {
      setPreview(result.data.rows);
      setNotice({ tone: 'error', message: t('workspaceAdmin.unitImport.changedSincePreview') });
      return;
    }

    const importedCount = result.data.importedCount;
    attempt.current = null;
    window.sessionStorage.removeItem(draftKey);
    setRows([]);
    setPreview([]);
    setSource(SAMPLE);
    setNotice({
      tone: 'success',
      message: t('workspaceAdmin.unitImport.applied').replace('{count}', String(importedCount)),
    });
    router.refresh();
  }

  return (
    <section aria-labelledby="unit-import-title" className="mt-5 border-t border-canvas-line pt-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            {t('workspaceAdmin.unitImport.eyebrow')}
          </p>
          <h3 id="unit-import-title" className="mt-1 text-base font-semibold text-canvas-ink">
            {t('workspaceAdmin.unitImport.title')}
          </h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-canvas-muted">
            {t('workspaceAdmin.unitImport.description')}
          </p>
        </div>
        <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-canvas-line bg-white px-3 text-xs font-semibold text-canvas-ink shadow-sm hover:bg-canvas-fog">
          <Upload className="h-4 w-4" aria-hidden="true" />
          {t('workspaceAdmin.unitImport.chooseFile')}
          <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={(event) => void loadFile(event)} />
        </label>
      </div>

      <label className="mt-4 block text-xs font-semibold text-canvas-muted">
        {t('workspaceAdmin.unitImport.csvLabel')}
        <textarea
          className="input-base mt-1 min-h-36 resize-y font-mono text-xs leading-relaxed"
          value={source}
          onChange={(event) => resetPreview(event.target.value)}
          spellCheck={false}
          aria-describedby="unit-import-help"
        />
      </label>
      <p id="unit-import-help" className="mt-2 text-xs leading-relaxed text-canvas-subtle">
        {t('workspaceAdmin.unitImport.csvHelp')}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn-secondary min-h-10 px-4" disabled={previewPending || applyPending} onClick={() => void runPreview()}>
          <FileCheck2 className="h-4 w-4" aria-hidden="true" />
          {previewPending ? t('workspaceAdmin.unitImport.previewing') : t('workspaceAdmin.unitImport.preview')}
        </button>
        <button type="button" className="btn-primary min-h-10 px-4" disabled={!canApply || previewPending || applyPending} onClick={() => void applyImport()}>
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          {applyPending ? t('workspaceAdmin.unitImport.applying') : t('workspaceAdmin.unitImport.apply')}
        </button>
      </div>
      <div className="mt-3">
        <NoticeBox notice={notice} actionLabel={t('workspaceAdmin.unitImport.openSecurity')} />
      </div>

      {preview.length ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-canvas-line">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-canvas-line bg-canvas-fog px-3 py-2 text-xs text-canvas-muted">
            <span>{t('workspaceAdmin.unitImport.summary').replace('{ready}', String(readyCount)).replace('{issues}', String(issueCount))}</span>
            <span>{t('workspaceAdmin.unitImport.atomic')}</span>
          </div>
          <div className="max-h-72 overflow-auto">
            <table className="w-full min-w-[44rem] text-left text-xs">
              <thead className="sticky top-0 bg-white text-canvas-muted shadow-sm">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">{t('workspaceAdmin.unitImport.columns.row')}</th>
                  <th scope="col" className="px-3 py-2 font-semibold">{t('workspaceAdmin.unitImport.columns.designation')}</th>
                  <th scope="col" className="px-3 py-2 font-semibold">{t('workspaceAdmin.unitImport.columns.category')}</th>
                  <th scope="col" className="px-3 py-2 font-semibold">{t('workspaceAdmin.unitImport.columns.parent')}</th>
                  <th scope="col" className="px-3 py-2 font-semibold">{t('workspaceAdmin.unitImport.columns.status')}</th>
                  <th scope="col" className="px-3 py-2 font-semibold">{t('workspaceAdmin.unitImport.columns.message')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-canvas-line bg-white text-canvas-ink">
                {preview.map((row) => (
                  <tr key={`${row.rowNumber}-${row.normalizedDesignation}`}>
                    <td className="px-3 py-2 tabular-nums text-canvas-muted">{row.rowNumber}</td>
                    <td className="px-3 py-2 font-medium">{row.designation}</td>
                    <td className="px-3 py-2">{row.unitCategory}</td>
                    <td className="px-3 py-2">{row.parentDesignation ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 font-semibold ${statusClasses(row.status)}`}>
                        {t(`workspaceAdmin.unitImport.status.${row.status.toLowerCase()}`)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-canvas-muted">{row.errorMessage ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
