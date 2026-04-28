import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient.js';
import { getApiErrorMessage } from '../../lib/getApiErrorMessage.js';
import { getDefaultRouteForRole } from '../../app/navigation.js';
import { AuthForm } from './AuthForm.jsx';
import { FormField } from './FormField.jsx';
import { useAuth } from './useAuth.js';

export function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login, user } = useAuth();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'driver',
    phone: ''
  });

  if (isAuthenticated) {
    return <Navigate replace to={getDefaultRouteForRole(user?.role)} />;
  }

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    try {
      const response = await apiClient.post('/auth/register', form);
      login(response.data.data);
      navigate(getDefaultRouteForRole(response.data.data.user?.role));
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to create account right now'));
    }
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
      submitLabel="Create account"
      title="Create your SmartPark account"
    >
      <FormField autoComplete="name" label="Full name" name="name" onChange={updateField} required value={form.name} />
      <FormField autoComplete="email" label="Email" name="email" onChange={updateField} required type="email" value={form.email} />
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
      <FormField autoComplete="tel" label="Phone optional" name="phone" onChange={updateField} type="tel" value={form.phone} />
    </AuthForm>
  );
}
