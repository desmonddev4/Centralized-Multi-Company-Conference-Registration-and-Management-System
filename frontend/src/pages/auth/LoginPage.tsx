import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { accountsApi } from '../../api/events';
// Save the sphere image here (adjust the path if your assets folder is elsewhere)
import './LoginPage.css';

const loginBg = '/assets/login-bg.jpg';

type Field = 'username' | 'password';

// One place for validation rules, easy to extend later
function validate(field: Field, value: string): string {
  if (field === 'username') {
    if (!value.trim()) return 'Username is required.';
    if (value.trim().length < 3) return 'Username must be at least 3 characters.';
  }
  if (field === 'password') {
    if (!value) return 'Password is required.';
    if (value.length < 6) return 'Password must be at least 6 characters.';
  }
  return '';
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Record<Field, boolean>>({ username: false, password: false });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [csrfReady, setCsrfReady] = useState(false);

  useEffect(() => {
    void accountsApi.session().catch(() => undefined).finally(() => setCsrfReady(true));
  }, []);

  const errors: Record<Field, string> = {
    username: validate('username', username),
    password: validate('password', password),
  };
  const showError = (f: Field) => touched[f] && errors[f];
  const isValid = !errors.username && !errors.password;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched({ username: true, password: true }); // reveal all errors on submit
    if (!isValid) return;
    setBusy(true);
    setError('');
    try {
      await accountsApi.login(username.trim(), password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from || '/admin', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  const fieldClass = (f: Field) =>
    `login-field${showError(f) ? ' is-invalid' : touched[f] && !errors[f] ? ' is-valid' : ''}`;

  return (
      <main className="staff-login" style={{ '--login-bg': `url(${loginBg})` } as CSSProperties}>
        <section className="staff-login-card">
          <Link className="login-back" to="/" aria-label="Back to website"><span aria-hidden="true">←</span> Back to website</Link>
          <p className="eyebrow">TEAM ACCESS</p>
          <h1>Sign in</h1>
          <p className="login-sub">Use your staff account to access conference operations.</p>

          <form onSubmit={(e) => void submit(e)} noValidate>
            <div className={fieldClass('username')}>
              <label htmlFor="login-username">Username</label>
              <input
                id="login-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, username: true }))}
                autoComplete="username"
                placeholder="e.g. jane.doe"
                aria-invalid={Boolean(showError('username'))}
                aria-describedby="login-username-err"
              />
              <span id="login-username-err" className="login-field-error" role="alert">
                {showError('username')}
              </span>
            </div>

            <div className={fieldClass('password')}>
              <label htmlFor="login-password">Password</label>
              <div className="login-input-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  aria-invalid={Boolean(showError('password'))}
                  aria-describedby="login-password-err"
                />
                <button
                  type="button"
                  className="login-toggle"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <span id="login-password-err" className="login-field-error" role="alert">
                {showError('password')}
              </span>
            </div>

            {error && (
              <div className="staff-login-error" role="alert">
                {error}
              </div>
            )}

            <button className="login-btn" disabled={busy || !csrfReady}>
              <span className="login-btn-label">
                {busy && <span className="login-spinner" aria-hidden="true" />}
                {!csrfReady ? 'Preparing secure sign-in…' : busy ? 'Signing in…' : 'Sign in'}
              </span>
            </button>
          </form>

          <Link className="login-forgot" to="/password-reset">
            Forgot your password?
          </Link>
        </section>
      </main>
  );
}
