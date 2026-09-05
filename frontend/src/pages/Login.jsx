import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Field, Input, Button } from '../components/Field.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    login(loginId, password).then((result) => {
      if (result.ok) navigate('/');
      else setError(result.error);
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-md border border-line bg-surface p-8">
        <p className="text-xs font-medium tracking-wide text-brass-dark">URBAN FURNITURE</p>
        <h1 className="mt-1 font-display text-3xl text-ink">Sign in to the ledger</h1>
        <p className="mt-2 mb-6 text-sm text-inksoft">Enter your Login Id and password to continue.</p>

        <form onSubmit={handleSubmit}>
          <Field label="Login Id">
            <Input required minLength="6" maxLength="12" pattern="[A-Za-z0-9._\\-]+" autoComplete="username" value={loginId} onChange={(e) => setLoginId(e.target.value)} />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          {error && <p className="mb-4 border border-brick bg-brick-light px-3 py-2 text-sm text-brick">{error}</p>}

          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-4 text-sm text-inksoft">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-walnut hover:text-walnut-dark">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
