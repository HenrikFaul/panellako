'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Route } from 'next';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  LockKeyhole,
  QrCode,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  isValidTotpCode,
  normalizeTotpCode,
  toSafeMfaQrDataUrl,
} from '../lib/auth/mfa';
import { sanitizeReturnTo } from '../lib/auth/return-to';
import { createClient, hasSupabaseConfig } from '../lib/supabase/browser';

type Notice = {
  tone: 'error' | 'success' | 'info';
  message: string;
};

type TotpFactor = {
  id: string;
  friendlyName: string;
  status: 'verified' | 'unverified';
  createdAt: string;
};

type Enrollment = {
  factorId: string;
  qrDataUrl: string | null;
  secret: string;
};

type Props = {
  email: string;
  returnTo: string;
  returnAfterEnrollment?: boolean;
  /** Test seam; production uses a full page navigation after successful step-up. */
  onVerificationComplete?: (safeReturnTo: string) => void;
};

function formatFactorDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Ismeretlen dátum';

  return new Intl.DateTimeFormat('hu-HU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function noticeClasses(tone: Notice['tone']): string {
  if (tone === 'error') return 'border-rose-200 bg-rose-50 text-rose-800';
  if (tone === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  return 'border-sky-200 bg-sky-50 text-sky-900';
}

export default function MfaSecurityClient({
  email,
  returnTo,
  returnAfterEnrollment = false,
  onVerificationComplete,
}: Props) {
  const safeReturnTo = sanitizeReturnTo(returnTo);
  const supabase = useMemo(
    () => (hasSupabaseConfig ? createClient() : null),
    [],
  );
  const enrollmentCodeRef = useRef<HTMLInputElement>(null);
  const stepUpCodeRef = useRef<HTMLInputElement>(null);
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [currentLevel, setCurrentLevel] = useState<string | null>(null);
  const [nextLevel, setNextLevel] = useState<string | null>(null);
  const [selectedFactorId, setSelectedFactorId] = useState('');
  const [friendlyName, setFriendlyName] = useState('PanelLakó hitelesítő');
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [enrollmentCode, setEnrollmentCode] = useState('');
  const [stepUpCode, setStepUpCode] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const finishVerification = useCallback(() => {
    if (onVerificationComplete) {
      onVerificationComplete(safeReturnTo);
      return;
    }
    window.location.assign(safeReturnTo);
  }, [onVerificationComplete, safeReturnTo]);

  const loadSecurityState = useCallback(async (): Promise<boolean> => {
    if (!supabase) {
      setNotice({
        tone: 'error',
        message: 'A hitelesítési szolgáltatás nincs konfigurálva.',
      });
      setLoading(false);
      return false;
    }

    const [factorsResult, assuranceResult] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);

    if (factorsResult.error || assuranceResult.error) {
      setNotice({
        tone: 'error',
        message: 'A biztonsági beállításokat most nem sikerült betölteni. Próbáld újra.',
      });
      setLoading(false);
      return false;
    }

    const totpFactors = (factorsResult.data?.all ?? [])
      .filter((factor) => factor.factor_type === 'totp')
      .map<TotpFactor>((factor) => ({
        id: factor.id,
        friendlyName: factor.friendly_name?.trim() || 'Hitelesítő alkalmazás',
        status: factor.status === 'verified' ? 'verified' : 'unverified',
        createdAt: factor.created_at,
      }));

    const verifiedFactors = totpFactors.filter((factor) => factor.status === 'verified');
    setFactors(totpFactors);
    setCurrentLevel(assuranceResult.data?.currentLevel ?? null);
    setNextLevel(assuranceResult.data?.nextLevel ?? null);
    setSelectedFactorId((current) => (
      verifiedFactors.some((factor) => factor.id === current)
        ? current
        : verifiedFactors[0]?.id ?? ''
    ));
    setLoading(false);
    return true;
  }, [supabase]);

  useEffect(() => {
    void loadSecurityState();
  }, [loadSecurityState]);

  useEffect(() => {
    if (enrollment) enrollmentCodeRef.current?.focus();
  }, [enrollment]);

  const startEnrollment = async () => {
    if (!supabase || busyAction) return;
    setNotice(null);
    setBusyAction('enroll');

    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: friendlyName.trim() || 'PanelLakó hitelesítő',
        issuer: 'PanelLakó',
      });

      if (error || !data) {
        setNotice({
          tone: 'error',
          message: 'A hitelesítő alkalmazás beállítását most nem sikerült elindítani.',
        });
        return;
      }

      setEnrollment({
        factorId: data.id,
        qrDataUrl: toSafeMfaQrDataUrl(data.totp.qr_code),
        secret: data.totp.secret,
      });
      setEnrollmentCode('');
      setNotice({
        tone: 'info',
        message: 'Olvasd be a QR-kódot a hitelesítő alkalmazással, majd írd be a hatjegyű kódot.',
      });
    } catch {
      setNotice({
        tone: 'error',
        message: 'A hitelesítési szolgáltatás átmenetileg nem érhető el.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const verifyEnrollment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !enrollment || busyAction) return;

    if (!isValidTotpCode(enrollmentCode)) {
      setNotice({ tone: 'error', message: 'Pontosan hat számjegyet adj meg.' });
      enrollmentCodeRef.current?.focus();
      return;
    }

    setNotice(null);
    setBusyAction('verify-enrollment');
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollment.factorId,
        code: normalizeTotpCode(enrollmentCode),
      });

      if (error) {
        setNotice({
          tone: 'error',
          message: 'A kód hibás vagy lejárt. Várd meg a következő kódot, majd próbáld újra.',
        });
        return;
      }

      setEnrollment(null);
      setEnrollmentCode('');
      await loadSecurityState();
      setNotice({
        tone: 'success',
        message: 'A kétlépcsős azonosítás aktív, a munkamenet AAL2 szintű.',
      });

      if (returnAfterEnrollment) finishVerification();
    } catch {
      setNotice({
        tone: 'error',
        message: 'A kód ellenőrzése közben átmeneti hiba történt.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const cancelEnrollment = async () => {
    if (!supabase || !enrollment || busyAction) return;
    setBusyAction('cancel-enrollment');
    setNotice(null);

    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: enrollment.factorId,
      });
      if (error) {
        setNotice({
          tone: 'error',
          message: 'A félbehagyott beállítást most nem sikerült törölni.',
        });
        return;
      }

      setEnrollment(null);
      setEnrollmentCode('');
      await loadSecurityState();
      setNotice({ tone: 'info', message: 'A félbehagyott beállítást töröltük.' });
    } catch {
      setNotice({
        tone: 'error',
        message: 'A hitelesítési szolgáltatás átmenetileg nem érhető el.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const removeUnverifiedFactor = async (factorId: string) => {
    if (!supabase || busyAction) return;
    setBusyAction(`remove-${factorId}`);
    setNotice(null);

    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) {
        setNotice({
          tone: 'error',
          message: 'A félbehagyott beállítást most nem sikerült törölni.',
        });
        return;
      }

      await loadSecurityState();
      setNotice({ tone: 'info', message: 'A félbehagyott beállítást töröltük.' });
    } catch {
      setNotice({
        tone: 'error',
        message: 'A hitelesítési szolgáltatás átmenetileg nem érhető el.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const stepUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !selectedFactorId || busyAction) return;

    if (!isValidTotpCode(stepUpCode)) {
      setNotice({ tone: 'error', message: 'Pontosan hat számjegyet adj meg.' });
      stepUpCodeRef.current?.focus();
      return;
    }

    setNotice(null);
    setBusyAction('step-up');
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: selectedFactorId,
        code: normalizeTotpCode(stepUpCode),
      });

      if (error) {
        setNotice({
          tone: 'error',
          message: 'A kód hibás vagy lejárt. Várd meg a következő kódot, majd próbáld újra.',
        });
        return;
      }

      setStepUpCode('');
      finishVerification();
    } catch {
      setNotice({
        tone: 'error',
        message: 'A megerősített hitelesítés most nem sikerült.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const verifiedFactors = factors.filter((factor) => factor.status === 'verified');

  return (
    <main className="app-surface min-h-screen px-4 py-8 sm:px-6 lg:py-12">
      <section className="mx-auto w-full max-w-5xl" aria-labelledby="security-title">
        <Link
          href={safeReturnTo as Route}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-brand-800 hover:bg-brand-50 hover:text-brand-950"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Vissza
        </Link>

        <div className="mt-4 overflow-hidden rounded-[1.75rem] border border-canvas-line bg-white shadow-card-lg">
          <header className="border-b border-canvas-line bg-gradient-to-br from-brand-50 via-white to-amber-50 px-6 py-7 sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-sm">
                  <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Fiókbiztonság</p>
                  <h1 id="security-title" className="mt-1 text-2xl font-semibold tracking-tight text-canvas-ink sm:text-3xl">
                    Kétlépcsős azonosítás
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-canvas-muted">
                    Védd a(z) <strong className="font-semibold text-canvas-ink">{email}</strong> fiókot egy hitelesítő alkalmazás hatjegyű kódjával.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-brand-100 bg-white/85 px-4 py-3 text-sm shadow-sm">
                <p className="font-semibold text-canvas-ink">
                  {loading ? 'Biztonsági szint betöltése…' : currentLevel === 'aal2' ? 'AAL2 · megerősítve' : 'AAL1 · alap szint'}
                </p>
                <p className="mt-1 text-xs text-canvas-muted">
                  {nextLevel === 'aal2' && currentLevel !== 'aal2'
                    ? 'A következő szint egy TOTP-kóddal érhető el.'
                    : 'Érzékeny művelet előtt friss kód kérhető.'}
                </p>
              </div>
            </div>
          </header>

          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-canvas-line bg-canvas-sage/55 p-5" aria-labelledby="registered-factors-title">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-800 ring-1 ring-canvas-line">
                    <KeyRound className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 id="registered-factors-title" className="font-semibold text-canvas-ink">Regisztrált hitelesítők</h2>
                    <p className="mt-0.5 text-xs text-canvas-muted">Kizárólag TOTP hitelesítő alkalmazás, SMS nélkül.</p>
                  </div>
                </div>

                {loading ? (
                  <div className="mt-5 flex items-center gap-2 text-sm text-canvas-muted" role="status">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Betöltés…
                  </div>
                ) : factors.length === 0 ? (
                  <p className="mt-5 rounded-xl border border-dashed border-canvas-line bg-white px-4 py-5 text-sm leading-6 text-canvas-muted">
                    Még nincs hitelesítő alkalmazás kapcsolva ehhez a fiókhoz.
                  </p>
                ) : (
                  <ul className="mt-5 space-y-3">
                    {factors.map((factor) => (
                      <li key={factor.id} className="flex flex-col gap-3 rounded-xl border border-canvas-line bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="flex items-center gap-2 text-sm font-semibold text-canvas-ink">
                            {factor.status === 'verified'
                              ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                              : <QrCode className="h-4 w-4 text-amber-600" aria-hidden="true" />}
                            {factor.friendlyName}
                          </p>
                          <p className="mt-1 text-xs text-canvas-muted">
                            {factor.status === 'verified' ? 'Aktív' : 'Félbehagyott beállítás'} · {formatFactorDate(factor.createdAt)}
                          </p>
                        </div>
                        {factor.status === 'verified' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFactorId(factor.id);
                              stepUpCodeRef.current?.focus();
                            }}
                            className="btn-secondary min-h-10 px-3 text-xs"
                          >
                            Kiválasztás
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void removeUnverifiedFactor(factor.id)}
                            disabled={busyAction !== null}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Törlés
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl border border-canvas-line bg-white p-5" aria-labelledby="enrollment-title">
                <div className="flex items-center gap-3">
                  <QrCode className="h-5 w-5 text-brand-700" aria-hidden="true" />
                  <h2 id="enrollment-title" className="font-semibold text-canvas-ink">Új hitelesítő beállítása</h2>
                </div>

                {!enrollment ? (
                  <div className="mt-5">
                    <label htmlFor="mfa-friendly-name" className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Eszköz neve
                    </label>
                    <input
                      id="mfa-friendly-name"
                      value={friendlyName}
                      onChange={(event) => setFriendlyName(event.target.value)}
                      maxLength={80}
                      className="input-base min-h-11"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => void startEnrollment()}
                      disabled={loading || busyAction !== null || !supabase}
                      className="btn-primary mt-4 min-h-11 w-full sm:w-auto"
                    >
                      {busyAction === 'enroll' ? 'Előkészítés…' : 'QR-kód létrehozása'}
                    </button>
                  </div>
                ) : (
                  <div className="mt-5">
                    <div className="grid gap-5 sm:grid-cols-[14rem_1fr] sm:items-start">
                      <div className="flex min-h-56 items-center justify-center rounded-2xl border border-canvas-line bg-white p-3 shadow-sm">
                        {enrollment.qrDataUrl ? (
                          <Image
                            src={enrollment.qrDataUrl}
                            alt="PanelLakó TOTP beállítási QR-kód"
                            width={208}
                            height={208}
                            unoptimized
                            className="h-52 w-52"
                          />
                        ) : (
                          <p className="px-3 text-center text-sm leading-6 text-canvas-muted">
                            A QR-kód nem jeleníthető meg biztonságosan. Használd a kézi kulcsot.
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-canvas-ink">Kézi beállítási kulcs</p>
                        <code className="mt-2 block break-all rounded-xl border border-canvas-line bg-canvas-sage px-3 py-3 text-sm font-semibold tracking-[0.12em] text-brand-950">
                          {enrollment.secret}
                        </code>
                        <p className="mt-2 text-xs leading-5 text-canvas-muted">
                          A QR-kód és a kulcs ugyanazt a titkot tartalmazza. Ne oszd meg, és ne készíts róla nyilvános képernyőképet.
                        </p>
                      </div>
                    </div>

                    <form className="mt-5" onSubmit={verifyEnrollment}>
                      <label htmlFor="mfa-enrollment-code" className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Hatjegyű ellenőrző kód
                      </label>
                      <input
                        ref={enrollmentCodeRef}
                        id="mfa-enrollment-code"
                        value={enrollmentCode}
                        onChange={(event) => setEnrollmentCode(event.target.value)}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={8}
                        className="input-base min-h-11 font-mono tracking-[0.24em]"
                        placeholder="123 456"
                        required
                      />
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <button type="submit" disabled={busyAction !== null} className="btn-primary min-h-11">
                          {busyAction === 'verify-enrollment' ? 'Ellenőrzés…' : 'Bekapcsolás'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void cancelEnrollment()}
                          disabled={busyAction !== null}
                          className="btn-secondary min-h-11"
                        >
                          Megszakítás és törlés
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </section>
            </div>

            <section className="h-fit rounded-2xl border border-brand-100 bg-brand-50/55 p-5 lg:sticky lg:top-6" aria-labelledby="step-up-title">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-800 ring-1 ring-brand-100">
                  <LockKeyhole className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 id="step-up-title" className="font-semibold text-canvas-ink">Friss biztonsági megerősítés</h2>
                  <p className="mt-0.5 text-xs text-canvas-muted">Érzékeny kezelői műveletek előtt.</p>
                </div>
              </div>

              {verifiedFactors.length === 0 ? (
                <p className="mt-5 rounded-xl border border-brand-100 bg-white px-4 py-4 text-sm leading-6 text-canvas-muted">
                  Előbb állíts be és aktiválj egy hitelesítő alkalmazást.
                </p>
              ) : (
                <form className="mt-5 space-y-4" onSubmit={stepUp}>
                  {verifiedFactors.length > 1 && (
                    <div>
                      <label htmlFor="mfa-factor" className="mb-1.5 block text-sm font-semibold text-slate-700">Hitelesítő</label>
                      <select
                        id="mfa-factor"
                        value={selectedFactorId}
                        onChange={(event) => setSelectedFactorId(event.target.value)}
                        className="input-base min-h-11"
                      >
                        {verifiedFactors.map((factor) => (
                          <option key={factor.id} value={factor.id}>{factor.friendlyName}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label htmlFor="mfa-step-up-code" className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Hitelesítő kód
                    </label>
                    <input
                      ref={stepUpCodeRef}
                      id="mfa-step-up-code"
                      value={stepUpCode}
                      onChange={(event) => setStepUpCode(event.target.value)}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={8}
                      className="input-base min-h-11 font-mono tracking-[0.24em]"
                      placeholder="123 456"
                      required
                    />
                  </div>

                  <button type="submit" disabled={busyAction !== null} className="btn-primary min-h-11 w-full">
                    {busyAction === 'step-up' ? 'Megerősítés…' : 'Megerősítés és folytatás'}
                  </button>
                  <p className="text-xs leading-5 text-canvas-muted">
                    Akkor is kérhetsz friss megerősítést, ha a munkamenet már AAL2 szintű. Ez frissíti az érzékeny műveletekhez használt MFA-időbélyeget.
                  </p>
                </form>
              )}
            </section>
          </div>

          {notice && (
            <div className="px-6 pb-6 sm:px-8 sm:pb-8">
              <p
                role={notice.tone === 'error' ? 'alert' : 'status'}
                aria-live="polite"
                className={`rounded-xl border px-4 py-3 text-sm leading-6 ${noticeClasses(notice.tone)}`}
              >
                {notice.message}
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
