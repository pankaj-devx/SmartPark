import { LocateFixed, MapPin } from 'lucide-react';

export function NearbyMapView({ center, onUseLocation, parkings }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-950">Nearby map</h2>
        <button
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          onClick={onUseLocation}
          type="button"
        >
          <LocateFixed className="h-4 w-4" aria-hidden="true" />
          Use location
        </button>
      </div>
      <div className="relative min-h-72 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#e2e8f0_1px,transparent_1px),linear-gradient(180deg,#e2e8f0_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute left-4 top-4 rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm">
          {center.lat && center.lng ? `${Number(center.lat).toFixed(4)}, ${Number(center.lng).toFixed(4)}` : 'Set a location for distance search'}
        </div>
        {parkings.slice(0, 8).map((parking, index) => (
          <div
            className="absolute"
            key={parking.id}
            style={{
              left: `${18 + ((index * 23) % 64)}%`,
              top: `${28 + ((index * 17) % 46)}%`
            }}
            title={parking.title}
          >
            <MapPin className="h-7 w-7 fill-brand-600 text-brand-700 drop-shadow" aria-hidden="true" />
          </div>
        ))}
      </div>
    </section>
  );
}
