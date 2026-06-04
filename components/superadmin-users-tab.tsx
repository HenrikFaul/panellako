'use client';

import { useCallback, useEffect, useState } from 'react';

interface UserRow {
  id:                       string;
  full_name:                string | null;
  email:                    string;
  created_at:               string;
  free_trial_start:         string | null;
  free_trial_days:          number;
  free_trial_never_expires: boolean;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' });
}

function toInputDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 10);
}

function trialEnd(user: UserRow): string {
  if (user.free_trial_never_expires) return 'Soha nem jár le';
  const start = user.free_trial_start ?? user.created_at;
  if (!start) return '—';
  const end = new Date(new Date(start).getTime() + user.free_trial_days * 86_400_000);
  const now = new Date();
  if (end < now) return `Lejárt (${fmtDate(end.toISOString())})`;
  const days = Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
  return `${days} nap (${fmtDate(end.toISOString())})`;
}

interface EditState {
  free_trial_start:         string;
  free_trial_days:          number;
  free_trial_never_expires: boolean;
}

export default function SuperadminUsersTab() {
  const [users,   setUsers]   = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search,  setSearch]  = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing,  setEditing]  = useState<Record<string, EditState>>({});
  const [saving,   setSaving]   = useState<string | null>(null);
  const [saveMsg,  setSaveMsg]  = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/superadmin/users')
      .then(r => r.json())
      .then((d: { users?: UserRow[] }) => setUsers(d.users ?? []))
      .catch(() => {/* ignore */})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || (u.email?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q));
  });

  function openEdit(u: UserRow) {
    setExpanded(u.id);
    setEditing(prev => ({
      ...prev,
      [u.id]: {
        free_trial_start:         toInputDate(u.free_trial_start ?? u.created_at),
        free_trial_days:          u.free_trial_days,
        free_trial_never_expires: u.free_trial_never_expires,
      },
    }));
  }

  async function save(userId: string) {
    const state = editing[userId];
    if (!state) return;
    setSaving(userId);

    const res = await fetch(`/api/superadmin/users/${userId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        free_trial_start:         state.free_trial_start ? new Date(state.free_trial_start).toISOString() : null,
        free_trial_days:          state.free_trial_days,
        free_trial_never_expires: state.free_trial_never_expires,
      }),
    });

    const data = await res.json() as { ok?: boolean; error?: string };
    setSaveMsg(prev => ({ ...prev, [userId]: data.ok ? '✓ Mentve' : `Hiba: ${data.error}` }));
    setSaving(null);

    if (data.ok) {
      setUsers(prev => prev.map(u => u.id !== userId ? u : {
        ...u,
        free_trial_start:         state.free_trial_start ? new Date(state.free_trial_start).toISOString() : null,
        free_trial_days:          state.free_trial_days,
        free_trial_never_expires: state.free_trial_never_expires,
      }));
      setTimeout(() => setSaveMsg(prev => { const n = { ...prev }; delete n[userId]; return n; }), 3000);
    }
  }

  function patch(userId: string, field: keyof EditState, value: unknown) {
    setEditing(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: value },
    }));
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">Felhasználók</h2>
          <p className="text-xs text-slate-500">{users.length} regisztrált felhasználó</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? 'Töltés…' : '↻ Frissítés'}
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Keresés név vagy e-mail alapján…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />

      {/* Table */}
      {loading && users.length === 0 ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">Nincs találat</p>
      ) : (
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {filtered.map(user => {
            const isOpen = expanded === user.id;
            const state  = editing[user.id];
            const msg    = saveMsg[user.id];

            return (
              <div key={user.id}>
                {/* Row */}
                <div
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50"
                  onClick={() => (isOpen ? setExpanded(null) : openEdit(user))}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-black text-indigo-700">
                      {(user.full_name ?? user.email).slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{user.full_name || '(névtelen)'}</p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="text-xs text-slate-400">Regisztrált</p>
                    <p className="text-xs font-semibold text-slate-700">{fmtDate(user.created_at)}</p>
                  </div>
                  <div className="hidden shrink-0 text-right md:block">
                    <p className="text-xs text-slate-400">Próbaidőszak vége</p>
                    <p className={`text-xs font-semibold ${user.free_trial_never_expires ? 'text-emerald-600' : trialEnd(user).startsWith('Lejárt') ? 'text-red-600' : 'text-slate-700'}`}>
                      {trialEnd(user)}
                    </p>
                  </div>
                  <span className="shrink-0 text-slate-300">{isOpen ? '▲' : '▼'}</span>
                </div>

                {/* Expanded edit panel */}
                {isOpen && state && (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 pb-4 pt-3">
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                      {/* Registration date — READ ONLY */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Regisztrációs dátum</label>
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                          <span className="text-sm text-slate-500">{fmtDate(user.created_at)}</span>
                          <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-400">NEM MÓDOSÍTHATÓ</span>
                        </div>
                      </div>

                      {/* Trial start date */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Próbaidőszak kezdete
                        </label>
                        <input
                          type="date"
                          value={state.free_trial_start}
                          disabled={state.free_trial_never_expires}
                          onChange={e => patch(user.id, 'free_trial_start', e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </div>

                      {/* Trial days */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Ingyenes időszak (nap)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={3650}
                          value={state.free_trial_days}
                          disabled={state.free_trial_never_expires}
                          onChange={e => patch(user.id, 'free_trial_days', Math.max(1, parseInt(e.target.value) || 14))}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        {!state.free_trial_never_expires && state.free_trial_start && (
                          <p className="text-[10px] text-slate-400">
                            Lejár: {fmtDate(
                              new Date(new Date(state.free_trial_start).getTime() + state.free_trial_days * 86_400_000).toISOString()
                            )}
                          </p>
                        )}
                      </div>

                      {/* Never expires toggle */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Soha nem jár le
                        </label>
                        <button
                          onClick={() => patch(user.id, 'free_trial_never_expires', !state.free_trial_never_expires)}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                            state.free_trial_never_expires
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 rounded border-2 transition-colors ${state.free_trial_never_expires ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                            {state.free_trial_never_expires && <span className="flex h-full w-full items-center justify-center text-[9px] font-black text-white">✓</span>}
                          </span>
                          Örökös hozzáférés
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <button
                        onClick={() => save(user.id)}
                        disabled={saving === user.id}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {saving === user.id ? 'Mentés…' : 'Mentés'}
                      </button>
                      <button
                        onClick={() => setExpanded(null)}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100"
                      >
                        Mégse
                      </button>
                      {msg && (
                        <span className={`text-sm font-bold ${msg.startsWith('✓') ? 'text-emerald-600' : 'text-red-600'}`}>
                          {msg}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
