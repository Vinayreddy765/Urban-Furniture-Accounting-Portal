import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, ROLES } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { Field, Input, Select, Button } from '../components/Field.jsx';

const EMPTY = { name: '', loginId: '', email: '', password: '', confirmPassword: '' };

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.name.trim().length < 2) { setError('Name must contain at least 2 characters.'); return; }
    if (!/^[A-Za-z0-9._-]{6,12}$/.test(form.loginId.trim())) { setError('Login Id must be 6-12 characters and use only letters, numbers, dot, underscore, or hyphen.'); return; }
    if (form.password.length < 9 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9])/.test(form.password)) { setError('Password must be more than 8 characters and contain lowercase, uppercase, and special characters.'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }

    const result = await register({ name: form.name.trim(), loginId: form.loginId.trim(), email: form.email.trim(), password: form.password });

    if (result.ok) navigate('/');
    else setError(result.error);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-md border border-line bg-surface p-8">
        <p className="text-xs font-medium tracking-wide text-brass-dark">URBAN FURNITURE</p>
        <h1 className="mt-1 font-display text-3xl text-ink">Create an account</h1>
        <p className="mt-2 mb-6 text-sm text-inksoft">
          Public registration creates an Accountant account. Customer/vendor portal accounts are created by an Administrator and linked to a Contact.
        </p>

        <form onSubmit={handleSubmit}>
          <Field label="Full name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Login Id"><Input required minLength="6" maxLength="12" pattern="[A-Za-z0-9._-]+" value={form.loginId} onChange={(e) => setForm({ ...form, loginId: e.target.value })} /></Field>
          <Field label="Email">
            <Input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Password">
              <Input
                type="password"
                required
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>
            <Field label="Confirm password">
              <Input
                type="password"
                required
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              />
            </Field>
          </div>

          {error && <p className="mb-4 border border-brick bg-brick-light px-3 py-2 text-sm text-brick">{error}</p>}

          <Button type="submit" className="w-full">
            Create account
          </Button>
        </form>

        <p className="mt-4 text-sm text-inksoft">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-walnut hover:text-walnut-dark">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
