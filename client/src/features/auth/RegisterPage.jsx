import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient.js';
import { getApiErrorMessage } from '../../lib/getApiErrorMessage.js';
import { getDefaultRouteForRole } from '../../app/navigation.js';
import { AuthForm } from './AuthForm.jsx';
import { validateEmail, validatePhone, normalizePhoneNumber } from './authValidation.js';
import { FormField } from './FormField.jsx';
import { GoogleAuthButton } from './GoogleAuthButton.jsx';
import { useAuth } from './useAuth.js';

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedRole = searchParams.get('role') === 'owner' ? 'owner' : 'driver';
  const { isAuthenticated, login, user } = useAuth();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: requestedRole,
    phone: ''
  });
  const [fieldErrors, setFieldErrors] = useState({ email: '', phone: '' });

  if (isAuthenticated) {
    return <Navigate replace to={getDefaultRouteForRole(user?.role)} />;
  }

  function updateField(event) {
    const { name, value } = event.target;
    setError('');
    
    let processedValue = value;
    
    // Normalize phone number on input
    if (name === 'phone' && value) {
      // Allow user to type freely, but validate on blur
      processedValue = value;
    }
    
    setForm((current) => ({ ...current, [name]: processedValue }));
    
    // Real-time validation
    if (name === 'email') {
      const emailError = validateEmail(value);
      setFieldErrors((current) => ({ ...current, email: emailError }));
    } else if (name === 'phone') {
      const phoneError = validatePhone(value);
      setFieldErrors((current) => ({ ...current, phone: phoneError }));
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

    const phoneError = validatePhone(form.phone);
    if (phoneError) { 
      setFieldErrors((current) => ({ ...current, phone: phoneError }));
      setError(phoneError); 
      return; 
    }

    try {
      // Normalize phone before sending to API
      const normalizedPhone = normalizePhoneNumber(form.phone);
      
      const response = await apiClient.post('/auth/register', {
        ...form,
        phone: normalizedPhone || ''
      });
      login(response.data.data);
      navigate(getDefaultRouteForRole(response.data.data.user?.role));
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to create account right now'));
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
          Already have an account?{' '}
          <Link className="font-semibold text-brand-700 hover:text-brand-600" to="/login">
            Sign in
          </Link>
        </p>
      }
      onSubmit={handleSubmit}
      submitLabel={requestedRole === 'owner' ? 'Start owner account' : 'Create account'}
      title={requestedRole === 'owner' ? 'List your parking space on SmartPark' : 'Create your SmartPark account'}
    >
      <FormField autoComplete="name" label="Full name" name="name" onChange={updateField} required value={form.name} />
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
        autoComplete="new-password"
        label="Password"
        minLength={8}
        name="password"
        onChange={updateField}
        required
        type="password"
        value={form.password}
      />
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Account type
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          name="role"
          onChange={updateField}
          value={form.role}
        >
          <option value="driver">Driver</option>
          <option value="owner">Parking owner</option>
        </select>
      </label>
      <FormField 
        autoComplete="tel" 
        label="Phone (optional)" 
        name="phone" 
        onChange={updateField} 
        type="tel" 
        value={form.phone}
        error={fieldErrors.phone}
        placeholder="+91 98765 43210"
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
