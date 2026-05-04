import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient.js';
import { getApiErrorMessage } from '../../lib/getApiErrorMessage.js';
import { getDefaultRouteForRole } from '../../app/navigation.js';
import { AuthForm } from './AuthForm.jsx';
import { validateEmail } from './authValidation.js';
import { FormField } from './FormField.jsx';
import { GoogleAuthButton } from './GoogleAuthButton.jsx';
import { useAuth } from './useAuth.js';

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login, user } = useAuth();
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });

  if (isAuthenticated) {
    return <Navigate replace to={getDefaultRouteForRole(user?.role)} />;
  }

  function updateField(event) {
    const { name, value } = event.target;
    setError('');
    setForm((current) => ({ ...current, [name]: value }));
    
    // Real-time email validation
    if (name === 'email') {
      const emailError = validateEmail(value);
      setFieldErrors((current) => ({ ...current, email: emailError }));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const emailError = validateEmail(form.email);
    if (emailError) { 
      setFieldErrors((current) => ({ ...current, email: emailError }));
      setError(emailError); 
      return; 
    }

    try {
      const response = await apiClient.post('/auth/login', form);
      login(response.data.data);
      navigate(getDefaultRouteForRole(response.data.data.user?.role));
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to sign in right now'));
    }
  }

  function handleGoogleSuccess(authData) {
    navigate(getDefaultRouteForRole(authData.user?.role));
  }

  return (
    <AuthForm
      error={error}
      footer={
        <p>
          New to SmartPark?{' '}
          <Link className="font-semibold text-brand-700 hover:text-brand-600" to="/register">
            Create an account
          </Link>
        </p>
      }
      onSubmit={handleSubmit}
      submitLabel="Sign in"
      title="Sign in"
    >
      <FormField 
        autoComplete="email" 
        label="Email" 
        name="email" 
        onChange={updateField} 
        required 
        type="email" 
        value={form.email}
        error={fieldErrors.email}
      />
      <FormField
        autoComplete="current-password"
        label="Password"
        name="password"
        onChange={updateField}
        required
        type="password"
        value={form.password}
      />

      <div className="relative flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs text-slate-400">or</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <GoogleAuthButton onSuccess={handleGoogleSuccess} onError={setError} />
    </AuthForm>
  );
}
