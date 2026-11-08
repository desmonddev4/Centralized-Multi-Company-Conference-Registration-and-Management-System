import { useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { accountsApi } from '../../api/events';
import './PasswordResetPage.css';

const loginBg = '/assets/login-bg.jpg';

type Field = 'email' | 'password' | 'confirmation';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function PasswordResetPage() {
  const [params] = useSearchParams();
  const uid = params.get('uid') || '';
  const token = params.get('token') || '';
  const changingPassword = Boolean(uid && token);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Record<Field, boolean>>({
    email: false,
    password: false,
    confirmation: false,
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Validation: only the fields visible in the current mode matter
  const errors: Record<Field, string> = {
    email: !email.trim()
      ? 'Email is required.'
      : !EMAIL_RE.test(email.trim())
        ? 'Enter a valid email address.'
        : '',
    password: !password
      ? 'New password is required.'
      : password.length < 10
        ? 'Use at least 10 characters.'
        : '',
    confirmation: !confirmation
      ? 'Please confirm your password.'
      : confirmation !== password
        ? 'The passwords do not match.'
        : '',
  };
  const activeFields: Field[] = changingPassword ? ['password', 'confirmation'] : ['email'];
  const isValid = activeFields.every((f) => !errors[f]);
  const showError = (f: Field) => touched[f] && errors[f];
  const fieldClass = (f: Field) =>
    `pr-field${showError(f) ? ' is-invalid' : touched[f] && !errors[f] ? ' is-valid' : ''}`;
  const blur = (f: Field) => () => setTouched((t) => ({ ...t, [f]: true }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched({ email: true, password: true, confirmation: true });
    if (!isValid) return;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      await accountsApi.session();
      if (changingPassword) {
        const result = await accountsApi.confirmPasswordReset(uid, token, password);
        setMessage(result.detail);
      } else {
        const result = await accountsApi.requestPasswordReset(email.trim());
        setMessage(result.detail);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Password recovery could not be completed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <main className="password-reset-page" style={{ '--login-bg': `url(${loginBg})` } as CSSProperties}>
        <section className="password-reset-card">
          <p className="eyebrow">TEAM ACCESS</p>
          <h1>{changingPassword ? 'Choose a new password' : 'Reset your password'}</h1>
          <p className="pr-sub">
            {changingPassword
              ? 'Set a new password for your staff account.'
              : 'Enter your staff account email and we’ll send a secure reset link if it matches an active account.'}
          </p>

          <form onSubmit={(e) => void submit(e)} noValidate>
            {changingPassword ? (
              <>
                <div className={fieldClass('password')}>
                  <label htmlFor="pr-password">New password</label>
                  <div className="pr-input-wrap">
                    <input
                      id="pr-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="At least 10 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={blur('password')}
                      aria-invalid={Boolean(showError('password'))}
                    />
                    <button
                      type="button"
                      className="pr-toggle"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <span className="pr-field-error" role="alert">{showError('password')}</span>
                </div>

                <div className={fieldClass('confirmation')}>
                  <label htmlFor="pr-confirm">Confirm new password</label>
                  <input
                    id="pr-confirm"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Repeat the new password"
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    onBlur={blur('confirmation')}
                    aria-invalid={Boolean(showError('confirmation'))}
                  />
                  <span className="pr-field-error" role="alert">{showError('confirmation')}</span>
                </div>
              </>
            ) : (
              <div className={fieldClass('email')}>
                <label htmlFor="pr-email">Staff account email</label>
                <input
                  id="pr-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={blur('email')}
                  aria-invalid={Boolean(showError('email'))}
                />
                <span className="pr-field-error" role="alert">{showError('email')}</span>
              </div>
            )}

            <button className="pr-btn" disabled={busy}>
              <span className="pr-btn-label">
                {busy && <span className="pr-spinner" aria-hidden="true" />}
                {busy ? 'Please wait…' : changingPassword ? 'Update password' : 'Send reset link'}
              </span>
            </button>
          </form>

          {message && (
            <p className="password-reset-message success" role="status">
              {message}
              {changingPassword && (
                <>
                  {' '}
                  <Link to="/login">Sign in</Link>
                </>
              )}
            </p>
          )}
          {error && (
            <p className="password-reset-message error" role="alert">
              {error}
            </p>
          )}

          <Link className="password-reset-back" to="/login">
            ← Back to staff sign in
          </Link>
        </section>
      </main>
    </>
  );
}
