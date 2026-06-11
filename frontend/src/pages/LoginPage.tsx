import { FormEvent, useState } from 'react';
import { Monitor } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../modules/auth/AuthProvider';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('admin@erp.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-split">
      <div className="login-brand">
        <div className="login-brand-icon">
          <Monitor size={24} />
        </div>
        <div className="login-brand-title">ERP Comercial</div>
        <div className="login-brand-sub">Inicia sesion para continuar</div>
      </div>
      <div className="login-form-panel">
        <form className="login-form-inner" onSubmit={handleSubmit}>
          <h1 className="login-title">Bienvenido</h1>
          <p className="login-subtitle">Ingresa con tu usuario administrador.</p>
          <label className="form-label">Email</label>
          <input className="form-input" value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          <label className="form-label">Contrasena</label>
          <input className="form-input" value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
          {error ? <div className="form-error">{error}</div> : null}
          <button className="btn-primary full" type="submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Iniciar sesion'}
          </button>
        </form>
      </div>
    </div>
  );
}
