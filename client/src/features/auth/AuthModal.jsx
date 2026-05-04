import { useState } from 'react';
import { X } from 'lucide-react';
import { apiClient } from '../../lib/apiClient.js';
import { getApiErrorMessage } from '../../lib/getApiErrorMessage.js';
import { validateEmail, validatePhone } from './authValidation.js';
import { FormField } from './FormField.jsx';
import { GoogleAuthButton } from './GoogleAuthButton.jsx';
import { useAuth } from './useAuth.js';

export function AuthModal({ isOpen, onClose, onSuccess, title = 'Sign in required' }) {
  const { login } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'driver',
    phone: ''
  });

  if (!isOpen) return null;

  function updateField(event) {
    setError('');
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const emailError = validateEmail(form.email);
    if (emailError) { setError(emailError); return; }

    if (mode === 'register') {
      const phoneError = validatePhone(form.phone);
      if (phoneError) { setError(phoneError); return; }
    }

    setIsLoading(true);

    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload = mode === 'login' ? { email: form.email, password: form.password } : form;
      const response = await apiClient.post(endpoint, payload);
      login(response.data.data);
      onSuccess?.();
      onClose();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, `Unable to ${mode === 'login' ? 'sign in' : 'create account'} right now`));
    } finally {
      setIsLoading(false);
    }
  }

  function handleGoogleSuccess() {
    onSuccess?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm">
      <div className="app-modal relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg p-6">
        <button
          className="absolute right-4 top-4 rounded-md p-1 hover:bg-slate-100"
          onClick={onClose}
          style={{ color: 'var(--app-text-soft)' }}
          type="button"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <h2 className="app-heading text-2xl font-bold">{title}</h2>
        <p className="app-copy mt-2 text-sm">
          {mode === 'login'
            ? 'Please sign in to continue with your action.'
            : 'Create an account to continue.'}
        </p>

        {error ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <FormField autoComplete="name" label="Full name" name="name" onChange={updateField} required value={form.name} />
          )}

          <FormField autoComplete="email" label="Email" name="email" onChange={updateField} required type="email" value={form.email} />

          <FormField
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            label="Password"
            minLength={mode === 'register' ? 8 : undefined}
            name="password"
            onChange={updateField}
            required
            type="password"
            value={form.password}
          />

          {mode === 'register' && (
            <>
              <label className="grid gap-2 text-sm font-medium" style={{ color: 'var(--app-text-muted)' }}>
                Account type
                <select className="app-input" name="role" onChange={updateField} value={form.role}>
                  <option value="driver">Driver</option>
                  <option value="owner">Parking owner</option>
                </select>
              </label>
              <FormField autoComplete="tel" label="Phone (optional)" name="phone" onChange={updateField} type="tel" value={form.phone} />
            </>
          )}

          <button
            className="mt-2 rounded-md bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-70"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="relative my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-400">or continue with</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <GoogleAuthButton onSuccess={handleGoogleSuccess} onError={setError} />

        <div className="app-copy mt-6 text-center text-sm">
          {mode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button
                className="font-semibold text-brand-700 hover:text-brand-600"
                onClick={() => { setMode('register'); setError(''); }}
                type="button"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                className="font-semibold text-brand-700 hover:text-brand-600"
                onClick={() => { setMode('login'); setError(''); }}
                type="button"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
