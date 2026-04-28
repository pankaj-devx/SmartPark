import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient.js';
import { getApiErrorMessage } from '../../lib/getApiErrorMessage.js';
import { AuthForm } from './AuthForm.jsx';
import { FormField } from './FormField.jsx';
import { useAuth } from './useAuth.js';

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    email: '',
    password: ''
  });

  if (isAuthenticated) {
    return <Navigate replace to="/dashboard" />;
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
      const response = await apiClient.post('/auth/login', form);
      login(response.data.data);
      navigate('/dashboard');
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to sign in right now'));
    }
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
      <FormField autoComplete="email" label="Email" name="email" onChange={updateField} required type="email" value={form.email} />
      <FormField
        autoComplete="current-password"
        label="Password"
        name="password"
        onChange={updateField}
        required
        type="password"
        value={form.password}
      />
    </AuthForm>
  );
}
