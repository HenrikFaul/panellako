'use client';

import { useState } from 'react';
import { X, Download, Send, UserCheck, UserX, Vote, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import {
  closeMeeting,
  sendAssemblyInvitation,
  recordAttendance,
  removeAttendance,
  recordVote,
  updateResolutionOutcome,
  generateProtocolManually,
} from '@/app/actions/meetings';

interface Unit {
  id: string;
  unit_label: string;
  owner_name: string;
  ownership_share: number;
}

interface Attendance {
  unit_id: string;
  ownership_share: number;
  proxy_name?: string;
  units?: { unit_label: string; owner_name: string };
}

interface AgendaItem {
  id: string;
  order_no: number;
  title: string;
  description?: string;
}

interface ResolutionVote {
  id: string;
  unit_id: string;
  vote_value: string;
  weight: number;
}

interface Resolution {
  id: string;
  agenda_item_id: string;
  text: string;
  outcome: string;
  effective_date?: string;
  votes?: ResolutionVote[];
}

interface Meeting {
  id: string;
  title: string;
  status: string;
  status_detail?: string;
  scheduled_at: string;
  location?: string;
  chairperson_name?: string;
  secretary_name?: string;
  actual_quorum?: number;
  quorum_threshold?: number;
  protocol_url?: string;
  protocol_generated_at?: string;
  invitation_sent_at?: string;
}

interface Props {
  meeting: Meeting;
  buildingId: string;
  units: Unit[];
  attendances: Attendance[];
  agendaItems: AgendaItem[];
  resolutions: Resolution[];
  isManager: boolean;
  supabaseUrl: string;
  onClose: () => void;
  onRefresh: () => void;
}

const outcomeLabels: Record<string, { label: string; color: string }> = {
  elfogadva: { label: 'Elfogadva', color: 'text-emerald-600' },
  elutasitva: { label: 'Elutasítva', color: 'text-red-600' },
  folyamatban: { label: 'Szavazás alatt', color: 'text-amber-600' },
};

const voteLabels: Record<string, { label: string; color: string }> = {
  igen: { label: 'Igen', color: 'text-emerald-600' },
  nem: { label: 'Nem', color: 'text-red-600' },
  tartozkodas: { label: 'Tartózkodik', color: 'text-amber-600' },
};

export default function MeetingDetailPanel({
  meeting,
  buildingId,
  units,
  attendances,
  agendaItems,
  resolutions,
  isManager,
  supabaseUrl,
  onClose,
  onRefresh,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [protocolUrl, setProtocolUrl] = useState(meeting.protocol_url);
  const [generatingProtocol, setGeneratingProtocol] = useState(false);

  const attendedUnitIds = new Set(attendances.map((a) => a.unit_id));
  const scheduledDate = new Date(meeting.scheduled_at);
  const daysUntil = Math.ceil((scheduledDate.getTime() - Date.now()) / 86_400_000);
  const isLocked = meeting.status === 'lezart' || meeting.status_detail === 'lezarva';

  const totalShare = units.reduce((s, u) => s + u.ownership_share, 0);
  const attendingShare = attendances.reduce((s, a) => s + a.ownership_share, 0);
  const quorumPct = totalShare > 0 ? (attendingShare / totalShare) * 100 : 0;
  const threshold = (meeting.quorum_threshold ?? 0.5) * 100;

  const act = async (fn: () => Promise<{ success: boolean; error?: string }>, successMsg: string) => {
    setBusy(true);
    setMsg('');
    const res = await fn();
    setBusy(false);
    if (res.success) {
      setMsg(successMsg);
      onRefresh();
    } else {
      setMsg(`Hiba: ${res.error}`);
    }
  };

  const handleToggleAttendance = async (unit: Unit) => {
    if (isLocked) return;
    if (attendedUnitIds.has(unit.id)) {
      await act(
        () => removeAttendance(meeting.id, unit.id),
        `${unit.unit_label} eltávolítva.`
      );
    } else {
      await act(
        () => recordAttendance({
          meeting_id: meeting.id,
          unit_id: unit.id,
          ownership_share: unit.ownership_share,
        }),
        `${unit.unit_label} rögzítve.`
      );
    }
  };

  const handleClose = async () => {
    if (!confirm('Lezárod a közgyűlést? Ez után nem módosítható a jelenlét.')) return;
    await act(
      () => closeMeeting(meeting.id, buildingId),
      'Közgyűlés lezárva. Jegyzőkönyv generálás folyamatban...'
    );
  };

  const handleGenerateProtocol = async () => {
    setGeneratingProtocol(true);
    setMsg('');
    const res = await generateProtocolManually(meeting.id, buildingId);
    setGeneratingProtocol(false);
    if (res.success) {
      setProtocolUrl(res.protocol_url ?? '');
      setMsg('Jegyzőkönyv sikeresen generálva!');
      onRefresh();
    } else {
      setMsg(`Hiba: ${res.error}`);
    }
  };

  const handleDownloadProtocol = async () => {
    if (!protocolUrl) return;
    // Try signed URL via API route first (works for private buckets)
    const res = await fetch(`/api/storage-signed-url?path=${encodeURIComponent(protocolUrl)}&bucket=documents`);
    if (res.ok) {
      const { url } = await res.json() as { url: string };
      window.open(url, '_blank');
    } else if (supabaseUrl) {
      // Fallback: direct public URL (works if documents bucket is public)
      window.open(`${supabaseUrl}/storage/v1/object/public/documents/${protocolUrl}`, '_blank');
    } else {
      setMsg('Letöltési link generálása sikertelen.');
    }
  };

  const handleSendInvitation = () =>
    act(() => sendAssemblyInvitation(meeting.id), 'Meghívó elküldve (naplózva).');

  const handleVote = (resolutionId: string, unitId: string, voteValue: 'igen' | 'nem' | 'tartozkodas', weight: number) =>
    act(
      () => recordVote({ resolution_id: resolutionId, unit_id: unitId, vote_value: voteValue, weight }),
      'Szavazat rögzítve.'
    );

  const handleOutcome = (resolutionId: string, outcome: 'elfogadva' | 'elutasitva') =>
    act(() => updateResolutionOutcome(resolutionId, outcome), 'Határozat eredménye rögzítve.');

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <aside
        className="relative flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start gap-3 border-b bg-white px-6 py-4">
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Közgyűlés részletek</p>
            <h2 className="text-lg font-black text-slate-800 leading-tight">{meeting.title}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
              <Clock size={13} className="shrink-0" />
              {scheduledDate.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
              {' '}{scheduledDate.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}
              {meeting.location ? ` · ${meeting.location}` : ''}
              {!isLocked && daysUntil > 0 && (
                <span className="ml-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-600">
                  {daysUntil} nap múlva
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="flex-1 space-y-6 px-6 py-5">
          {/* Status message */}
          {msg && (
            <p className={`rounded-2xl px-4 py-2.5 text-sm font-medium ${msg.startsWith('Hiba') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {msg}
            </p>
          )}

          {/* Quorum indicator */}
          <div className="rounded-2xl border bg-slate-50 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-slate-700">Határozatképesség</span>
              <span className={`text-sm font-black ${quorumPct >= threshold ? 'text-emerald-600' : 'text-red-500'}`}>
                {quorumPct.toFixed(1)}% / {threshold}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-200">
              <div
                className={`h-2 rounded-full transition-all ${quorumPct >= threshold ? 'bg-emerald-500' : 'bg-red-400'}`}
                style={{ width: `${Math.min(quorumPct, 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              {attendances.length} jelenlévő · {attendedUnitIds.size}/{units.length} albetét
            </p>
          </div>

          {/* Manager actions */}
          {isManager && (
            <div className="flex flex-wrap gap-2">
              {!isLocked && daysUntil >= 1 && (
                <button
                  disabled={busy || !!(meeting.invitation_sent_at)}
                  onClick={handleSendInvitation}
                  className="flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700 hover:bg-brand-100 disabled:opacity-50"
                >
                  <Send size={13} /> Meghívó küldése
                  {meeting.invitation_sent_at && <span className="text-[10px] opacity-60">(elküldve)</span>}
                </button>
              )}
              {!isLocked && (
                <button
                  disabled={busy}
                  onClick={handleClose}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                >
                  <Vote size={13} /> Közgyűlés lezárása
                </button>
              )}
              {(isLocked || meeting.status === 'lezart') && (
                <button
                  disabled={generatingProtocol}
                  onClick={handleGenerateProtocol}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                >
                  <FileText size={13} /> {generatingProtocol ? 'Generálás...' : 'Jegyzőkönyv generálása'}
                </button>
              )}
              {protocolUrl && (
                <button
                  onClick={handleDownloadProtocol}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  <Download size={13} /> Letöltés (PDF)
                </button>
              )}
            </div>
          )}

          {/* Attendance list */}
          <section>
            <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-500">Jelenlét rögzítése</h3>
            <div className="space-y-1.5">
              {units.map((unit) => {
                const attended = attendedUnitIds.has(unit.id);
                return (
                  <div
                    key={unit.id}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${attended ? 'bg-emerald-50' : 'bg-slate-50'} ${!isLocked && isManager ? 'cursor-pointer hover:opacity-80' : ''}`}
                    onClick={() => isManager && !isLocked && handleToggleAttendance(unit)}
                  >
                    {attended
                      ? <UserCheck size={15} className="shrink-0 text-emerald-600" />
                      : <UserX size={15} className="shrink-0 text-slate-400" />}
                    <span className="font-bold text-slate-800 w-12">{unit.unit_label}</span>
                    <span className="flex-1 text-slate-600 truncate">{unit.owner_name}</span>
                    <span className="text-xs text-slate-400">{(unit.ownership_share * 100).toFixed(2)}%</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Agenda + Resolutions + Voting */}
          <section>
            <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-500">Napirendi pontok és határozatok</h3>
            <div className="space-y-4">
              {agendaItems.map((item) => {
                const itemResolutions = resolutions.filter((r) => r.agenda_item_id === item.id);
                return (
                  <div key={item.id} className="rounded-2xl border bg-white p-4">
                    <p className="font-bold text-slate-800">{item.order_no}. {item.title}</p>
                    {item.description && <p className="mt-1 text-xs text-slate-500">{item.description}</p>}
                    {itemResolutions.length > 0 && (
                      <div className="mt-3 space-y-3">
                        {itemResolutions.map((res) => {
                          const oc = outcomeLabels[res.outcome] ?? outcomeLabels.folyamatban;
                          const votes = res.votes ?? [];
                          const votedUnitIds = new Set(votes.map((v) => v.unit_id));
                          const unvotedAttendingUnits = units.filter(
                            (u) => attendedUnitIds.has(u.id) && !votedUnitIds.has(u.id)
                          );

                          return (
                            <div key={res.id} className="rounded-xl bg-slate-50 p-3">
                              <p className="text-xs text-slate-600">{res.text}</p>

                              {/* Outcome label + manager outcome buttons */}
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className={`text-xs font-bold ${oc.color}`}>{oc.label}</span>
                                {isManager && !isLocked && res.outcome === 'folyamatban' && (
                                  <>
                                    <button
                                      onClick={() => handleOutcome(res.id, 'elfogadva')}
                                      className="flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 hover:bg-emerald-200"
                                    >
                                      <CheckCircle size={11} /> Elfogad
                                    </button>
                                    <button
                                      onClick={() => handleOutcome(res.id, 'elutasitva')}
                                      className="flex items-center gap-1 rounded-lg bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 hover:bg-red-200"
                                    >
                                      <XCircle size={11} /> Elutasít
                                    </button>
                                  </>
                                )}
                              </div>

                              {/* Cast votes display */}
                              {votes.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Leadott szavazatok</p>
                                  {votes.map((v) => {
                                    const unit = units.find((u) => u.id === v.unit_id);
                                    const vl = voteLabels[v.vote_value] ?? { label: v.vote_value, color: 'text-slate-600' };
                                    return (
                                      <div key={v.id} className="flex items-center gap-2 text-xs">
                                        <span className="w-12 font-bold text-slate-700">{unit?.unit_label ?? '—'}</span>
                                        <span className={`font-bold ${vl.color}`}>{vl.label}</span>
                                        <span className="text-slate-400">({(v.weight * 100).toFixed(2)}%)</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Vote buttons for attending units that haven't voted yet */}
                              {!isLocked && res.outcome === 'folyamatban' && unvotedAttendingUnits.length > 0 && (
                                <div className="mt-2 space-y-1.5 border-t border-slate-200 pt-2">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Szavazás</p>
                                  {unvotedAttendingUnits.map((unit) => (
                                    <div key={unit.id} className="flex items-center gap-2">
                                      <span className="w-12 text-xs font-bold text-slate-700">{unit.unit_label}</span>
                                      <button
                                        disabled={busy}
                                        onClick={() => handleVote(res.id, unit.id, 'igen', unit.ownership_share)}
                                        className="rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
                                      >
                                        Igen
                                      </button>
                                      <button
                                        disabled={busy}
                                        onClick={() => handleVote(res.id, unit.id, 'nem', unit.ownership_share)}
                                        className="rounded-lg bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 hover:bg-red-200 disabled:opacity-50"
                                      >
                                        Nem
                                      </button>
                                      <button
                                        disabled={busy}
                                        onClick={() => handleVote(res.id, unit.id, 'tartozkodas', unit.ownership_share)}
                                        className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 hover:bg-amber-200 disabled:opacity-50"
                                      >
                                        Tartózkodik
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {agendaItems.length === 0 && (
                <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-400">Nincs napirendi pont rögzítve.</p>
              )}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
