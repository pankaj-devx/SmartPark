export function FormField({ label, ...inputProps }) {
  return (
    <label className="grid gap-2 text-sm font-medium" style={{ color: 'var(--app-text-muted)' }}>
      {label}
      <input
        className="app-input"
        {...inputProps}
      />
    </label>
  );
}
