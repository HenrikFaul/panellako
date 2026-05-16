'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Clock, Send, Users } from 'lucide-react';
import { createAnnouncement } from '@/app/actions/announcements';
import type { AnnouncementScope, AnnouncementPriority } from '@/app/actions/announcements';

interface UnitOption {
  id: string;
  unit_label: string;
}

interface AnnouncementComposerProps {
  buildingId?: string;
  units?: UnitOption[];
  onSuccess?: () => void;
}

type Mode = 'altalanos' | 'celzott' | 'hataridos';

const TOPICS = [
  'Közlemény',
  'Karbantartási értesítő',
  'Közgyűlési meghívó',
  'Szavazás',
  'Pénzügyi tájékoztató',
  'Vészhelyzeti értesítő',
  'Egyéb',
];

const PRIORITY_LABELS: Record<AnnouncementPriority, string> = {
  low: 'Alacsony',
  normal: 'Normál',
  high: 'Magas',
  urgent: 'Sürgős',
};

const SCOPE_LABELS: Record<AnnouncementScope, string> = {
  all: 'Mindenki',
  owners: 'Tulajdonosok',
  residents: 'Lakók',
  specific_units: 'Kiválasztott albetétek',
};

const REMINDER_PRESETS = [
  { label: '7, 3, 1 nap', value: [7, 3, 1] },
  { label: '3, 1 nap', value: [3, 1] },
  { label: '1 nap', value: [1] },
];

export default function AnnouncementComposer({ buildingId, units = [], onSuccess }: AnnouncementComposerProps) {
  const [mode, setMode] = useState<Mode>('altalanos');
  const [scope, setScope] = useState<AnnouncementScope>('all');
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [topicValue, setTopicValue] = useState(TOPICS[0]);
  const [customTopic, setCustomTopic] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [deadline, setDeadline] = useState('');
  const [reminderDays, setReminderDays] = useState<number[]>([3, 1]);
  const [requiresAck, setRequiresAck] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const effectiveTitle = topicValue === 'Egyéb' ? customTopic.trim() : topicValue;

  const isValid =
    effectiveTitle.length > 0 &&
    content.trim().length > 0 &&
    (mode !== 'celzott' || selectedUnitIds.length > 0 || scope !== 'specific_units');

  function toggleUnit(id: string) {
    setSelectedUnitIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSend() {
    if (!isValid) return;
    setStatus('sending');
    setErrorMsg('');

    const result = await createAnnouncement({
      title: effectiveTitle,
      content: content.trim(),
      building_id: buildingId,
      scope: mode === 'celzott' && selectedUnitIds.length > 0 ? 'specific_units' : scope,
      unit_ids: mode === 'celzott' && selectedUnitIds.length > 0 ? selectedUnitIds : undefined,
      priority,
      deadline: deadline || null,
      requires_acknowledgement: requiresAck,
      reminder_days: deadline ? reminderDays : undefined,
      send_email: sendEmail,
    });

    if (result.success) {
      setStatus('done');
      setContent('');
      setSelectedUnitIds([]);
      setDeadline('');
      setCustomTopic('');
      setTopicValue(TOPICS[0]);
      setMode('altalanos');
      setScope('all');
      setPriority('normal');
      setRequiresAck(false);
      setSendEmail(true);
      onSuccess?.();
      setTimeout(() => setStatus('idle'), 3500);
    } else {
      setStatus('error');
      setErrorMsg(result.error ?? 'Ismeretlen hiba');
    }
  }

  return (
    <div className="space-y-5">
      {/* Mode selector */}
      <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
        {(
          [
            { key: 'altalanos', label: 'Általános hír' },
            { key: 'celzott', label: 'Célzott üzenet' },
            { key: 'hataridos', label: 'Határidős értesítő' },
          ] as { key: Mode; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setMode(key);
              if (key === 'hataridos') setRequiresAck(true);
              if (key === 'altalanos') setScope('all');
            }}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
              mode === key
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Audience */}
      {mode === 'celzott' ? (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Albetétek kiválasztása</p>
          {units.length === 0 ? (
            <p className="text-sm text-slate-400">Nincsenek albetétek ehhez az épülethez.</p>
          ) : (
            <div className="max-h-40 overflow-y-auto rounded-2xl border border-slate-200 p-2">
              {units.map((u) => (
                <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selectedUnitIds.includes(u.id)}
                    onChange={() => toggleUnit(u.id)}
                    className="rounded accent-brand-600"
                  />
                  {u.unit_label}
                </label>
              ))}
            </div>
          )}
          {selectedUnitIds.length > 0 && (
            <p className="text-xs text-brand-700 font-semibold">
              {selectedUnitIds.length} albetét kiválasztva
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Célcsoport</p>
          <div className="flex flex-wrap gap-2">
            {(['all', 'owners', 'residents'] as AnnouncementScope[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                  scope === s
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Users size={11} />
                {SCOPE_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Topic */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Téma</p>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTopicValue(t)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                topicValue === t
                  ? 'bg-brand-100 text-brand-700 ring-1 ring-brand-300'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {topicValue === 'Egyéb' && (
          <input
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            placeholder="Egyedi tárgy megnevezése…"
            className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm"
          />
        )}
      </div>

      {/* Content */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Üzenet</p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="Az értesítés szövege…"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-relaxed"
        />
      </div>

      {/* Deadline (always visible for hataridos mode) */}
      {(mode === 'hataridos' || showOptions) && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Határidő</p>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm"
          />
          {deadline && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500">Emlékeztetők</p>
              <div className="flex flex-wrap gap-2">
                {REMINDER_PRESETS.map(({ label, value }) => {
                  const active = JSON.stringify(reminderDays) === JSON.stringify(value);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setReminderDays(value)}
                      className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                        active
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Clock size={10} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Options toggle */}
      <button
        type="button"
        onClick={() => setShowOptions((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
      >
        <span>Speciális beállítások</span>
        {showOptions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {showOptions && (
        <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          {/* Priority */}
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-slate-500">Prioritás</p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(PRIORITY_LABELS) as [AnnouncementPriority, string][]).map(([p, label]) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                    priority === p
                      ? p === 'urgent'
                        ? 'bg-rose-500 text-white'
                        : p === 'high'
                        ? 'bg-amber-500 text-white'
                        : 'bg-brand-600 text-white'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Checkboxes */}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={requiresAck}
              onChange={(e) => setRequiresAck(e.target.checked)}
              className="rounded accent-brand-600"
            />
            Olvasási visszaigazolás szükséges
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="rounded accent-brand-600"
            />
            Email értesítés küldése
          </label>
        </div>
      )}

      {/* Audience summary */}
      <div className="rounded-2xl bg-brand-50 px-4 py-3 text-xs text-brand-700">
        <span className="font-bold">Összefoglaló: </span>
        {effectiveTitle || '—'} &middot;{' '}
        {mode === 'celzott' && selectedUnitIds.length > 0
          ? `${selectedUnitIds.length} albetét`
          : SCOPE_LABELS[scope]}
        {deadline ? ` · Határidő: ${deadline}` : ''}
        {priority !== 'normal' ? ` · ${PRIORITY_LABELS[priority]}` : ''}
      </div>

      {/* Status */}
      {status === 'done' && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          <CheckCircle2 size={16} />
          Értesítés sikeresen elküldve!
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      {/* Send button */}
      <button
        type="button"
        disabled={!isValid || status === 'sending'}
        onClick={handleSend}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-black text-white transition-all hover:bg-brand-700 disabled:opacity-50"
      >
        {status === 'sending' ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Küldés…
          </>
        ) : (
          <>
            <Send size={15} />
            Értesítés kiküldése
          </>
        )}
      </button>
    </div>
  );
}
