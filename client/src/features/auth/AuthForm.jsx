import { AlertCircle } from 'lucide-react';

export function AuthForm({ children, error, footer, onSubmit, submitLabel, title }) {
  return (
    <section className="mx-auto flex max-w-6xl justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-950">{title}</h1>

        {error ? (
          <div className="mt-5 flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{error}</p>
          </div>
        ) : null}

        <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
          {children}
          <button className="rounded-md bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700" type="submit">
            {submitLabel}
          </button>
        </form>

        {footer ? <div className="mt-5 text-sm text-slate-600">{footer}</div> : null}
      </div>
    </section>
  );
}

