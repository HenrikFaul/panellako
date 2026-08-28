'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, MailCheck, ShieldCheck } from 'lucide-react';
import Logo from '@/components/logo';
import { createClient, hasSupabaseConfig } from '@/lib/supabase/browser';

type Notice = { tone: 'error' | 'success'; message: string };

interface RpcErrorLike {
  code?: string;
  message?: string;
  details?: string;
}

interface InvitationAcceptClientProps {
  token: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SYSTEM_UPDATE_MESSAGE = 'Rendszerfrissítés szükséges: a meghívások elfogadása még nem érhető el ezen a telepítésen.';

function isMissingRpc(error: RpcErrorLike | null): boolean {
  if (!error) return false;
  const message = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return error.code === 'PGRST202'
    || error.code === '42883'
    || message.includes('could not find the function')
    || message.includes('does not exist')
    || message.includes('schema cache');
}

function findWorkspaceId(value: unknown): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== 'object' || candidate === null) return null;
  const record = candidate as Record<string, unknown>;
  for (const key of ['workspace_id', 'activated_workspace_id']) {
    if (typeof record[key] === 'string' && UUID_PATTERN.test(record[key])) {
      return record[key];
    }
  }
  return null;
}

export default function InvitationAcceptClient({ token }: InvitationAcceptClientProps) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const idempotencyKey = useRef<string | null>(null);

  const acceptInvitation = async () => {
    setNotice(null);
    if (!token || token.length > 1024) {
      setNotice({ tone: 'error', message: 'A meghívási hivatkozás érvénytelen.' });
      return;
    }
    if (!hasSupabaseConfig) {
      setNotice({ tone: 'error', message: 'A meghívási szolgáltatás nincs konfigurálva.' });
      return;
    }

    idempotencyKey.current ??= window.crypto.randomUUID();
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('accept_membership_invitation', {
        p_token: token,
        p_idempotency_key: idempotencyKey.current,
      });

      if (error) {
        setNotice({
          tone: 'error',
          message: isMissingRpc(error)
            ? SYSTEM_UPDATE_MESSAGE
            : 'A meghívást nem sikerült elfogadni. Lehet, hogy lejárt, visszavonták, vagy másik e-mail-címhez tartozik.',
        });
        return;
      }

      setWorkspaceId(findWorkspaceId(data));
      setAccepted(true);
      setNotice({ tone: 'success', message: 'A meghívást sikeresen elfogadtad. A szerver az aktuális jogosultságok alapján aktiválta a hozzáférést.' });
      idempotencyKey.current = null;
    } catch {
      setNotice({
        tone: 'error',
        message: 'A meghívási szolgáltatás átmenetileg nem érhető el. Ugyanezzel a hivatkozással biztonságosan újrapróbálhatod.',
      });
    } finally {
      setLoading(false);
    }
  };

  const destination = workspaceId ? `/w/${workspaceId}` : '/app';

  return (
    <main className="app-surface relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div aria-hidden="true" className="absolute -left-32 top-20 h-80 w-80 rounded-full bg-brand-100/65 blur-3xl" />
      <div aria-hidden="true" className="absolute -right-28 bottom-0 h-80 w-80 rounded-full bg-sky-100/55 blur-3xl" />

      <section className="relative w-full max-w-lg rounded-[1.5rem] border border-canvas-line bg-white p-6 text-center shadow-card-lg sm:p-8" aria-labelledby="invitation-title">
        <Logo className="mx-auto h-12 w-12" />
        <div className="mx-auto mt-5 grid h-14 w-14 place-items-center rounded-2xl bg-canvas-sage text-brand-800 ring-1 ring-brand-100">
          {accepted ? <CheckCircle2 className="h-7 w-7" aria-hidden="true" /> : <MailCheck className="h-7 w-7" aria-hidden="true" />}
        </div>

        <h1 id="invitation-title" className="mt-5 text-2xl font-semibold tracking-tight text-canvas-ink">
          {accepted ? 'Meghívás elfogadva' : 'Lakóközösségi meghívás'}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-canvas-muted">
          {accepted
            ? 'A hozzáférésed elkészült. Most már megnyithatod a hozzád rendelt közösséget.'
            : 'A meghívás elfogadásakor a rendszer újraellenőrzi a címzettet, a lejáratot és a meghívó aktuális jogosultságát.'}
        </p>

        {!accepted && (
          <div className="mt-6 rounded-xl border border-brand-100 bg-canvas-sage px-4 py-3 text-left">
            <p className="flex gap-2 text-sm leading-relaxed text-brand-900">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              A link önmagában nem elég: csak az erre az e-mail-címre bejelentkezett felhasználó és egy még érvényes meghívás aktiválhat hozzáférést.
            </p>
          </div>
        )}

        {notice && (
          <p
            role={notice.tone === 'error' ? 'alert' : 'status'}
            aria-live="polite"
            className={`mt-5 rounded-xl border px-4 py-3 text-left text-sm leading-relaxed ${notice.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}
          >
            {notice.message}
          </p>
        )}

        <div className="mt-6">
          {accepted ? (
            <a href={destination} className="btn-primary min-h-11 w-full">
              Közösség megnyitása
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          ) : (
            <button type="button" onClick={() => void acceptInvitation()} disabled={loading} className="btn-primary min-h-11 w-full">
              {loading ? 'Ellenőrzés és elfogadás…' : 'Meghívás elfogadása'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <Link href="/app" className="mt-4 inline-block rounded text-sm font-semibold text-brand-800 hover:text-brand-950">Vissza az épületeimhez</Link>
      </section>
    </main>
  );
}
