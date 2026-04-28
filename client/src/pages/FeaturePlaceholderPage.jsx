import { Link } from 'react-router-dom';

export function FeaturePlaceholderPage({ actionLabel, actionTo, eyebrow, title, description }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium uppercase text-brand-700">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-950">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {actionLabel && actionTo ? (
          <Link className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" to={actionTo}>
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
