import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

export function FormField({ label, error, onBlur, showInstantValidation, ...inputProps }) {
  const [touched, setTouched] = useState(false);
  
  const handleBlur = (e) => {
    setTouched(true);
    if (onBlur) {
      onBlur(e);
    }
  };
  
  const showError = error && (touched || showInstantValidation);
  
  return (
    <label className="grid gap-2 text-sm font-medium" style={{ color: 'var(--app-text-muted)' }}>
      {label}
      <input
        className={`app-input ${showError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
        onBlur={handleBlur}
        {...inputProps}
      />
      {showError && (
        <span className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {error}
        </span>
      )}
    </label>
  );
}
