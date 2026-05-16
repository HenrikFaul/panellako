export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="max-w-sm rounded-3xl bg-slate-900 p-8 text-center">
        <p className="text-4xl font-black text-teal-400">PanelLakó</p>
        <p className="mt-4 text-lg font-bold text-slate-100">Nincs internetkapcsolat</p>
        <p className="mt-2 text-sm text-slate-400">
          Az alkalmazás offline módban nem érhető el. Kérjük, ellenőrizze internetkapcsolatát és próbálja újra.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 w-full rounded-2xl bg-teal-600 px-4 py-3 text-sm font-black text-white hover:bg-teal-700"
        >
          Újratöltés
        </button>
      </div>
    </div>
  );
}
