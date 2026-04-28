import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold text-slate-950">Page not found</h1>
      <p className="mt-3 text-slate-600">The route you opened does not exist yet.</p>
      <Link className="mt-6 inline-flex rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white" to="/">
        Back home
      </Link>
    </section>
  );
}

