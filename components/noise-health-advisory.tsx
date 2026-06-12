// Server component — no client interactivity needed
// WHO/EEA Lnight threshold reference table for noise health advisory

export default function NoiseHealthAdvisory() {
  const thresholds = [
    {
      range: 'L<sub>night</sub> &lt; 40 dB',
      rangeText: 'Lnight < 40 dB',
      label: 'Elfogadható',
      detail: 'Nincs mért egészséghatás a legtöbb embernél.',
      color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
      badge: 'bg-emerald-500/20 text-emerald-300',
      icon: '✓',
    },
    {
      range: '40–55 dB',
      rangeText: '40–55 dB',
      label: 'Alvászavar lehetséges',
      detail: 'WHO: megnövekedett ébredési epizódok, fokozott stressz-hormon szint.',
      color: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
      badge: 'bg-yellow-500/20 text-yellow-300',
      icon: '⚠',
    },
    {
      range: '55–65 dB',
      rangeText: '55–65 dB',
      label: 'Szív- és érrendszeri kockázat',
      detail: 'EEA: szignifikáns összefüggés a szívinfarktus kockázatával és magas vérnyomással.',
      color: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
      badge: 'bg-orange-500/20 text-orange-300',
      icon: '!',
    },
    {
      range: '&gt; 65 dB',
      rangeText: '> 65 dB',
      label: 'Súlyos egészségügyi veszély',
      detail: 'WHO: magas halálozási és betegségi kockázat, különösen gyerekeknél és idős korban.',
      color: 'border-red-500/30 bg-red-500/10 text-red-300',
      badge: 'bg-red-500/20 text-red-300',
      icon: '✕',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="mb-1 text-lg font-semibold text-white">Egészségügyi küszöbértékek</h2>
        <p className="mb-5 text-sm text-white/50">
          WHO és Európai Környezetvédelmi Ügynökség (EEA) iránymutatása alapján
        </p>

        <div className="space-y-3">
          {thresholds.map((t) => (
            <div
              key={t.rangeText}
              className={`rounded-xl border p-4 ${t.color}`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold ${t.badge}`}>
                  {t.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold">{t.rangeText}</span>
                    <span className="font-semibold text-sm">{t.label}</span>
                  </div>
                  <p className="mt-1 text-xs opacity-80">{t.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EU Noise map reference */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="mb-2 text-base font-bold text-white">Budapest Stratégiai Zajtérkép</h3>
        <p className="mb-3 text-sm text-white/50">
          A 2002/49/EK EU-irányelv szerinti felmérés: közúti, vasúti és repülőtéri zajexpozíció.
        </p>
        <a
          href="https://www.budapest.hu/Lapok/zajterkep.aspx"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-400/20"
        >
          Budapest zajtérkép megnyitása
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* EU context */}
      <div className="rounded-xl border border-white/5 bg-white/3 p-4">
        <p className="text-xs text-white/40 leading-relaxed">
          <strong className="text-white/60">Forrás:</strong>{' '}
          WHO Environmental Noise Guidelines for the European Region (2018) és az EEA{' '}
          &quot;Noise in Europe 2022&quot; jelentés. Az L<sub>night</sub> az éjszakai (22–06) zajterhelés éves átlaga.
        </p>
      </div>
    </div>
  );
}
