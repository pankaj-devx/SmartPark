import { MapPin, ShieldCheck, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';

const highlights = [
  {
    icon: MapPin,
    title: 'Find parking nearby',
    text: 'Search by city, distance, price, and availability window.'
  },
  {
    icon: Timer,
    title: 'Reserve by time',
    text: 'Book only the hours you need with conflict checks on the backend.'
  },
  {
    icon: ShieldCheck,
    title: 'Owner-managed spaces',
    text: 'Owners can publish, pause, and manage trusted parking listings.'
  }
];

export function HomePage() {
  return (
    <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
      <div>
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-brand-700">
          Phase 2 Scaffold
        </p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-normal text-slate-950 sm:text-5xl">
          Smart parking reservations for real spaces, real owners, and real availability.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
          This shell is ready for authentication, parking listings, search, bookings, dashboards, and maps.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rounded-md bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700" to="/parkings">
            Start searching
          </Link>
          <Link className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100" to="/owner/parkings">
            List a space
          </Link>
        </div>
      </div>

      <div className="grid gap-4">
        {highlights.map((item) => (
          <article key={item.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <item.icon className="mb-4 h-6 w-6 text-brand-600" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-slate-950">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
