'use client';

import { useState } from 'react';
import { X, Download, Send, UserCheck, UserX, Vote, CheckCircle, XCircle, Clock, FileText, PlayCircle } from 'lucide-react';
import {
  closeMeeting,
  openMeetingVoting,
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
  profile_id?: string | null;
  proxy_name?: string;
  units?: { unit_label: string; owner_name: string };
}

interface EligibleVoter {
  unit_id: string;
  profile_id: string;
  display_name: string;
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
  workspaceId: string;
  units: Unit[];
  attendances: Attendance[];
  eligibleVoters: EligibleVoter[];
  agendaItems: AgendaItem[];
  resolutions: Resolution[];
  isManager: boolean;
  canVote: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const outcomeLabels: Record<string, { label: string; color: string }> = {
  elfogadva: { label: 'Elfogadva', color: 'text-emerald-400' },
  elutasitva: { label: 'Elutasítva', color: 'text-rose-400' },
  folyamatban: { label: 'Szavazás alatt', color: 'text-amber-400' },
};

const voteLabels: Record<string, { label: string; color: string }> = {
  igen: { label: 'Igen', color: 'text-emerald-400' },
  nem: { label: 'Nem', color: 'text-rose-400' },
  tartozkodas: { label: 'Tartózkodik', color: 'text-amber-400' },
};

export default function MeetingDetailPanel({
  meeting,
  workspaceId,
  units,
  attendances,
  eligibleVoters,
  agendaItems,
  resolutions,
  isManager,
  canVote,
  onClose,
  onRefresh,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [protocolUrl, setProtocolUrl] = useState(meeting.protocol_url);
  const [generatingProtocol, setGeneratingProtocol] = useState(false);
  const [selectedVoterByUnit, setSelectedVoterByUnit] = useState<Record<string, string>>({});

  const attendedUnitIds = new Set(attendances.map((a) => a.unit_id));
  const attendanceByUnit = new Map(attendances.map((attendance) => [attendance.unit_id, attendance]));
  const scheduledDate = new Date(meeting.scheduled_at);
  const daysUntil = Math.ceil((scheduledDate.getTime() - Date.now()) / 86_400_000);
  const isLocked = meeting.status === 'lezart' || meeting.status_detail === 'lezarva';
  const isVotingOpen = meeting.status === 'tervezett' && meeting.status_detail === 'szavazas_folyamatban';

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
        () => removeAttendance(meeting.id, unit.id, workspaceId),
        `${unit.unit_label} eltávolítva.`
      );
    } else {
      const unitVoters = eligibleVoters.filter((voter) => voter.unit_id === unit.id);
      const voterProfileId = isManager
        ? selectedVoterByUnit[unit.id]
        : unitVoters[0]?.profile_id;
      if (!voterProfileId) {
        setMsg('Hiba: A jelenléthez ellenőrzött tulajdonost kell kiválasztani.');
        return;
      }
      await act(
        () => recordAttendance({
          workspaceId,
          meeting_id: meeting.id,
          unit_id: unit.id,
          profile_id: voterProfileId,
        }),
        `${unit.unit_label} rögzítve.`
      );
    }
  };

  const handleClose = async () => {
    if (!confirm('Lezárod a közgyűlést? Ez után nem módosítható a jelenlét.')) return;
    await act(
      () => closeMeeting(meeting.id, workspaceId),
      'Közgyűlés lezárva. Jegyzőkönyv generálás folyamatban...'
    );
  };

  const handleOpenVoting = async () => {
    if (!confirm('Megnyitod a szavazást? Ettől kezdve csak profilhoz kötött, ellenőrzött tulajdonosi szavazat rögzíthető.')) return;
    await act(
      () => openMeetingVoting(meeting.id, workspaceId),
      'A szavazás megnyílt.'
    );
  };

  const handleGenerateProtocol = async () => {
    setGeneratingProtocol(true);
    setMsg('');
    const res = await generateProtocolManually(meeting.id, workspaceId);
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
    const params = new URLSearchParams({
      path: protocolUrl,
      workspace_id: workspaceId,
      meeting_id: meeting.id,
    });
    const res = await fetch(`/api/storage-signed-url?${params.toString()}`);
    if (res.ok) {
      const { url } = await res.json() as { url: string };
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      setMsg('Letöltési link generálása sikertelen.');
    }
  };

  const handleSendInvitation = () =>
    act(() => sendAssemblyInvitation(meeting.id, workspaceId), 'Meghívó elküldve (naplózva).');

  const handleVote = (
    resolutionId: string,
    unitId: string,
    voteValue: 'igen' | 'nem' | 'tartozkodas',
  ) => {
    const attendeeProfileId = attendanceByUnit.get(unitId)?.profile_id;
    if (!attendeeProfileId) {
      setMsg('Hiba: A szavazathoz profilhoz kötött jelenlét szükséges.');
      return Promise.resolve();
    }
    return act(
      () => recordVote({
        workspaceId,
        resolution_id: resolutionId,
        unit_id: unitId,
        vote_value: voteValue,
        attendee_profile_id: attendeeProfileId,
      }),
      'Szavazat rögzítve.'
    );
  };

  const handleOutcome = (resolutionId: string, outcome: 'elfogadva' | 'elutasitva') =>
    act(() => updateResolutionOutcome(resolutionId, outcome, workspaceId), 'Határozat eredménye rögzítve.');

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <aside
        className="relative flex h-full w-full max-w-2xl flex-col overflow-y-auto border-l border-white/10 bg-ink-panel text-slate-200 shadow-overlay"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-white/10 bg-ink-panel px-6 py-4">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-400">Közgyűlés részletek</p>
            <h2 className="text-lg font-semibold text-slate-100 leading-tight">{meeting.title}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-400">
              <Clock size={13} className="shrink-0" />
              {scheduledDate.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
              {' '}{scheduledDate.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}
              {meeting.location ? ` · ${meeting.location}` : ''}
              {!isLocked && daysUntil > 0 && (
                <span className="ml-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-300 ring-1 ring-sky-500/25">
                  {daysUntil} nap múlva
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-white/[0.08] hover:text-slate-200"><X size={18} /></button>
        </div>

        <div className="flex-1 space-y-6 px-6 py-5">
          {/* Status message */}
          {msg && (
            <p className={`rounded-xl px-4 py-2.5 text-sm font-medium ${msg.startsWith('Hiba') ? 'border border-rose-500/20 bg-rose-500/10 text-rose-300' : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300'}`}>
              {msg}
            </p>
          )}

          {/* Quorum indicator */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-200">Határozatképesség</span>
              <span className={`text-sm font-semibold tabular-nums ${quorumPct >= threshold ? 'text-emerald-400' : 'text-rose-400'}`}>
                {quorumPct.toFixed(1)}% / {threshold}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.08]">
              <div
                className={`h-2 rounded-full transition-all ${quorumPct >= threshold ? 'bg-emerald-500' : 'bg-rose-500'}`}
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
                  className="flex items-center gap-1.5 rounded-lg bg-brand-500/10 px-3 py-2 text-xs font-semibold text-brand-300 ring-1 ring-brand-500/25 hover:bg-brand-500/20 disabled:opacity-50"
                >
                  <Send size={13} /> Meghívó küldése
                  {meeting.invitation_sent_at && <span className="text-[10px] opacity-60">(elküldve)</span>}
                </button>
              )}
              {!isLocked && (
                !isVotingOpen ? (
                  <button
                    disabled={busy}
                    onClick={handleOpenVoting}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/25 hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    <PlayCircle size={13} /> Szavazás megnyitása
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/25">
                    <PlayCircle size={13} /> Szavazás megnyitva
                  </span>
                )
              )}
              {!isLocked && (
                <button
                  disabled={busy}
                  onClick={handleClose}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/25 hover:bg-amber-500/20 disabled:opacity-50"
                >
                  <Vote size={13} /> Közgyűlés lezárása
                </button>
              )}
              {(isLocked || meeting.status === 'lezart') && (
                <button
                  disabled={generatingProtocol}
                  onClick={handleGenerateProtocol}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.08] disabled:opacity-50"
                >
                  <FileText size={13} /> {generatingProtocol ? 'Generálás...' : 'Jegyzőkönyv generálása'}
                </button>
              )}
              {protocolUrl && (
                <button
                  onClick={handleDownloadProtocol}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/25 hover:bg-emerald-500/20"
                >
                  <Download size={13} /> Letöltés (PDF)
                </button>
              )}
            </div>
          )}

          {/* Attendance list */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Jelenlét rögzítése</h3>
            <div className="space-y-1.5">
              {units.map((unit) => {
                const attendance = attendanceByUnit.get(unit.id);
                const attended = Boolean(attendance);
                const unitVoters = eligibleVoters.filter((voter) => voter.unit_id === unit.id);
                const attendee = unitVoters.find((voter) => voter.profile_id === attendance?.profile_id);
                const canEditAttendance = !isLocked && (isManager || (canVote && unitVoters.length > 0));
                return (
                  <div
                    key={unit.id}
                    className={`flex flex-wrap items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${attended ? 'border border-emerald-500/20 bg-emerald-500/[0.07]' : 'border border-white/[0.05] bg-white/[0.03]'}`}
                  >
                    {attended
                      ? <UserCheck size={15} className="shrink-0 text-emerald-400" />
                      : <UserX size={15} className="shrink-0 text-slate-500" />}
                    <span className="font-semibold text-slate-200 w-12">{unit.unit_label}</span>
                    <span className="min-w-0 flex-1 text-slate-400 truncate">
                      {attendee?.display_name ?? unit.owner_name}
                    </span>
                    <span className="text-xs text-slate-500 tabular-nums">{(unit.ownership_share * 100).toFixed(2)}%</span>
                    {!attended && isManager && !isLocked && (
                      <select
                        aria-label={`${unit.unit_label} jogosult tulajdonosa`}
                        value={selectedVoterByUnit[unit.id] ?? ''}
                        onChange={(event) => setSelectedVoterByUnit((current) => ({
                          ...current,
                          [unit.id]: event.target.value,
                        }))}
                        className="min-w-44 rounded-md border border-white/10 bg-ink-base px-2 py-1 text-xs text-slate-200"
                      >
                        <option value="">Tulajdonos kiválasztása</option>
                        {unitVoters.map((voter) => (
                          <option key={voter.profile_id} value={voter.profile_id}>{voter.display_name}</option>
                        ))}
                      </select>
                    )}
                    {canEditAttendance && (
                      <button
                        type="button"
                        disabled={busy || (!attended && isManager && !selectedVoterByUnit[unit.id])}
                        onClick={() => handleToggleAttendance(unit)}
                        className="rounded-md border border-white/10 px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-white/[0.08] disabled:opacity-50"
                      >
                        {attended ? 'Eltávolítás' : isManager ? 'Rögzítés' : 'Jelen vagyok'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Agenda + Resolutions + Voting */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Napirendi pontok és határozatok</h3>
            <div className="space-y-4">
              {agendaItems.map((item) => {
                const itemResolutions = resolutions.filter((r) => r.agenda_item_id === item.id);
                return (
                  <div key={item.id} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <p className="font-semibold text-slate-100">{item.order_no}. {item.title}</p>
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
                            <div key={res.id} className="rounded-lg border border-white/[0.05] bg-white/[0.03] p-3">
                              <p className="text-xs text-slate-300">{res.text}</p>

                              {/* Outcome label + manager outcome buttons */}
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className={`text-xs font-bold ${oc.color}`}>{oc.label}</span>
                                {isManager && isVotingOpen && res.outcome === 'folyamatban' && (
                                  <>
                                    <button
                                      onClick={() => handleOutcome(res.id, 'elfogadva')}
                                      className="flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25"
                                    >
                                      <CheckCircle size={11} /> Elfogad
                                    </button>
                                    <button
                                      onClick={() => handleOutcome(res.id, 'elutasitva')}
                                      className="flex items-center gap-1 rounded-md bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-300 ring-1 ring-rose-500/30 hover:bg-rose-500/25"
                                    >
                                      <XCircle size={11} /> Elutasít
                                    </button>
                                  </>
                                )}
                              </div>

                              {/* Cast votes display */}
                              {votes.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Leadott szavazatok</p>
                                  {votes.map((v) => {
                                    const unit = units.find((u) => u.id === v.unit_id);
                                    const vl = voteLabels[v.vote_value] ?? { label: v.vote_value, color: 'text-slate-400' };
                                    return (
                                      <div key={v.id} className="flex items-center gap-2 text-xs">
                                        <span className="w-12 font-semibold text-slate-300">{unit?.unit_label ?? '—'}</span>
                                        <span className={`font-bold ${vl.color}`}>{vl.label}</span>
                                        <span className="text-slate-500 tabular-nums">({(v.weight * 100).toFixed(2)}%)</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Vote buttons for attending units that haven't voted yet */}
                              {(isManager || canVote) && isVotingOpen && res.outcome === 'folyamatban' && unvotedAttendingUnits.length > 0 && (
                                <div className="mt-2 space-y-1.5 border-t border-white/10 pt-2">
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Szavazás</p>
                                  {unvotedAttendingUnits.map((unit) => (
                                    <div key={unit.id} className="flex items-center gap-2">
                                      <span className="w-12 text-xs font-semibold text-slate-300">{unit.unit_label}</span>
                                      <button
                                        disabled={busy}
                                        onClick={() => handleVote(res.id, unit.id, 'igen')}
                                        className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-50"
                                      >
                                        Igen
                                      </button>
                                      <button
                                        disabled={busy}
                                        onClick={() => handleVote(res.id, unit.id, 'nem')}
                                        className="rounded-md bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-300 ring-1 ring-rose-500/30 hover:bg-rose-500/25 disabled:opacity-50"
                                      >
                                        Nem
                                      </button>
                                      <button
                                        disabled={busy}
                                        onClick={() => handleVote(res.id, unit.id, 'tartozkodas')}
                                        className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/30 hover:bg-amber-500/25 disabled:opacity-50"
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
                <p className="rounded-xl border border-white/[0.05] bg-white/[0.03] px-4 py-3 text-sm text-slate-500">Nincs napirendi pont rögzítve.</p>
              )}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
