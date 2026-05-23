import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Mail,
  MapPin,
  MessageSquare,
  Clock,
  HelpCircle,
  ArrowRight,
  CheckCircle,
  Building2,
  Wrench,
  FileText,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Kapcsolat — PanelLakó',
  description:
    'Lépj kapcsolatba a PanelLakó csapatával. Kérdés, ajánlatkérés vagy visszajelzés — szívesen segítünk.',
  alternates: { canonical: 'https://panellako.hu/kapcsolat' },
};

const contactPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: 'Kapcsolat — PanelLakó',
  url: 'https://panellako.hu/kapcsolat',
  description:
    'Lépj kapcsolatba a PanelLakó csapatával. Kérdés, ajánlatkérés vagy visszajelzés — szívesen segítünk.',
  mainEntity: {
    '@type': 'Organization',
    name: 'PanelLakó',
    url: 'https://panellako.hu',
    email: 'hello@panellako.hu',
    areaServed: 'HU',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'hello@panellako.hu',
      availableLanguage: 'Hungarian',
      hoursAvailable: 'Mo-Fr 09:00-18:00',
    },
  },
};

const FAQ_SCENARIOS = [
  {
    icon: Building2,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    title: 'Próba-időszakkal kapcsolatos kérdések',
    body: 'Szeretné kipróbálni a PanelLakót, de kérdése van a regisztrációval, az adatmigrációval vagy a 14 napos próba feltételeivel kapcsolatban? Írjon nekünk, és részletesen válaszolunk.',
  },
  {
    icon: Wrench,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    title: 'Technikai segítség',
    body: 'Valami nem úgy működik, ahogy kellene? Küldje el a hibaleírást és — ha lehetséges — egy képernyőfotót. Csapatunk a lehető leggyorsabban megvizsgálja és megoldja a problémát.',
  },
  {
    icon: FileText,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-500',
    title: 'Árajánlat kérés',
    body: 'Több épületet kezel, vagy egyedi integrációra van szüksége? Enterprise ügyfeleknek személyre szabott ajánlatot állítunk össze. Adja meg az épületek számát és az albetétek körülbelüli számát.',
  },
];

export default function KapcsolatPage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactPageSchema) }}
      />

      <PublicNav />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <div className="mb-14 text-center">
          <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-md shadow-brand-200">
            <MessageSquare size={26} className="text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Kapcsolat
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-500">
            Kérdése van, visszajelzést szeretne küldeni, vagy ajánlatot kér? Szívesen segítünk —
            írjon nekünk bátran.
          </p>
        </div>

        {/* ── How to reach us ────────────────────────────────────────────── */}
        <section aria-labelledby="contact-options-heading" className="mb-16">
          <h2
            id="contact-options-heading"
            className="mb-8 text-2xl font-black text-slate-900"
          >
            Hogyan érhet el minket?
          </h2>
          <div className="grid gap-5 sm:grid-cols-3">

            {/* Email */}
            <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                <Mail size={22} className="text-brand-600" />
              </div>
              <h3 className="mb-1.5 text-base font-black text-slate-900">E-mail</h3>
              <a
                href="mailto:hello@panellako.hu"
                className="text-sm font-semibold text-brand-600 underline-offset-2 hover:text-brand-700 hover:underline"
              >
                hello@panellako.hu
              </a>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Általános kérdések, visszajelzések, partnerség
              </p>
            </div>

            {/* Response time */}
            <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                <Clock size={22} className="text-emerald-600" />
              </div>
              <h3 className="mb-1.5 text-base font-black text-slate-900">Válaszidő</h3>
              <p className="text-sm font-semibold text-emerald-700">
                1 munkanapon belül
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Általában 1 munkanapon belül válaszolunk. Munkaidő: H–P, 9–18 óra.
              </p>
            </div>

            {/* Office */}
            <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                <MapPin size={22} className="text-slate-600" />
              </div>
              <h3 className="mb-1.5 text-base font-black text-slate-900">Irodánk</h3>
              <p className="text-sm font-semibold text-slate-700">Budapest, Magyarország</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Személyes találkozót előzetes egyeztetés alapján tudunk fogadni.
              </p>
            </div>

          </div>
        </section>

        {/* ── Contact form ───────────────────────────────────────────────── */}
        {/*
          TODO: This form currently has no action. To make it functional, create a
          Next.js Server Action (e.g. app/actions/contact.ts) that validates the
          fields and sends the message via an email provider (e.g. Resend, Nodemailer).
          Then bind it to this form with the `action` prop.
        */}
        <section aria-labelledby="contact-form-heading" className="mb-16">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                <MessageSquare size={18} className="text-brand-600" />
              </div>
              <div>
                <h2
                  id="contact-form-heading"
                  className="text-xl font-black text-slate-900"
                >
                  Üzenet küldése
                </h2>
                <p className="text-sm text-slate-500">Töltse ki az alábbi mezőket</p>
              </div>
            </div>

            <form className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                {/* Name */}
                <div>
                  <label
                    htmlFor="contact-name"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Neve <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    name="name"
                    autoComplete="name"
                    placeholder="Kovács Anna"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 transition-colors"
                  />
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="contact-email"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    E-mail <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="kovacs.anna@email.hu"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 transition-colors"
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label
                  htmlFor="contact-subject"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Tárgy <span className="text-rose-500">*</span>
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  name="subject"
                  placeholder="pl. Árajánlat kérés — 3 épület, ~120 albetét"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 transition-colors"
                />
              </div>

              {/* Message */}
              <div>
                <label
                  htmlFor="contact-message"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Üzenet <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={5}
                  placeholder="Írja le kérdését vagy igényét..."
                  required
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 transition-colors"
                />
              </div>

              {/* Submit */}
              <div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-sm shadow-brand-200 transition-all hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2"
                >
                  <Mail size={16} />
                  Üzenet elküldése
                </button>
                <p className="mt-3 text-xs text-slate-400">
                  A gombra kattintva elfogadja az{' '}
                  <Link
                    href="/adatvedelmi-iranyelvek"
                    className="underline underline-offset-2 hover:text-brand-600"
                  >
                    adatvédelmi irányelveinket
                  </Link>
                  .
                </p>
              </div>
            </form>
          </div>
        </section>

        {/* ── FAQ — When to contact us ───────────────────────────────────── */}
        <section aria-labelledby="faq-heading" className="mb-16">
          <h2
            id="faq-heading"
            className="mb-2 text-2xl font-black text-slate-900"
          >
            Mikor keresnek meg minket?
          </h2>
          <p className="mb-8 text-slate-500">
            A leggyakoribb témák, amelyekben írnak nekünk.
          </p>
          <div className="grid gap-5 sm:grid-cols-3">
            {FAQ_SCENARIOS.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.title}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-card"
                >
                  <div
                    className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${s.iconBg}`}
                  >
                    <Icon size={22} className={s.iconColor} />
                  </div>
                  <h3 className="mb-2 text-base font-black text-slate-900">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{s.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Quick links ────────────────────────────────────────────────── */}
        <section
          aria-label="Hasznos linkek"
          className="mb-16 rounded-2xl border border-slate-100 bg-slate-50 px-6 py-8"
        >
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-card">
            <HelpCircle size={18} className="text-brand-600" />
          </div>
          <h2 className="mb-2 text-xl font-black text-slate-900">
            Mielőtt írna — nézze meg a GYIK-et
          </h2>
          <p className="mb-5 text-sm leading-relaxed text-slate-500">
            Sok kérdésre már részletes választ talál a Gyakran Ismételt Kérdések oldalon.
            Ez általában gyorsabb, mint a válaszra várni.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/gyik"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-card transition-all hover:bg-brand-50 hover:text-brand-700 hover:shadow-card-md"
            >
              <HelpCircle size={15} />
              Gyakori kérdések
              <ArrowRight size={14} className="text-slate-400" />
            </Link>
            <Link
              href="/funkciok"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-card transition-all hover:bg-brand-50 hover:text-brand-700 hover:shadow-card-md"
            >
              Funkciók
              <ArrowRight size={14} className="text-slate-400" />
            </Link>
            <Link
              href="/arak"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-card transition-all hover:bg-brand-50 hover:text-brand-700 hover:shadow-card-md"
            >
              Árak
              <ArrowRight size={14} className="text-slate-400" />
            </Link>
          </div>
        </section>

        {/* ── Bottom CTA ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-card-md">
          <h2 className="mb-2 text-2xl font-black text-white">
            Próbálja ki 14 napig ingyen
          </h2>
          <p className="mb-6 text-brand-100">
            Kártyaadat nem szükséges. Azonnali hozzáférés az összes funkcióhoz.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-700 shadow-sm transition-all hover:bg-brand-50"
            >
              <CheckCircle size={16} />
              Ingyenes regisztráció
            </Link>
            <Link
              href="/rolunk"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-white/20"
            >
              Rólunk
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>

      </main>

      <PublicFooter />
    </div>
  );
}
