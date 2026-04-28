export function FormField({ label, ...inputProps }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      <input
        className="rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        {...inputProps}
      />
    </label>
  );
}

