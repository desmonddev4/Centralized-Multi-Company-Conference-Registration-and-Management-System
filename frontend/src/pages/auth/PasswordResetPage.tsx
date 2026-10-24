import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import { accountsApi } from '../../api/events';
import './PasswordResetPage.css';

export default function PasswordResetPage() {
  const [params] = useSearchParams();
  const uid = params.get('uid') || '';
  const token = params.get('token') || '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event:FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(''); setError('');
    try {
      await accountsApi.session();
      if (uid && token) {
        if (password !== confirmation) throw new Error('The passwords do not match.');
        const result = await accountsApi.confirmPasswordReset(uid,token,password); setMessage(result.detail);
      } else {
        const result = await accountsApi.requestPasswordReset(email); setMessage(result.detail);
      }
    } catch (cause) { setError(cause instanceof Error?cause.message:'Password recovery could not be completed.'); }
    finally { setBusy(false); }
  }
  const changingPassword = Boolean(uid && token);
  return <PublicLayout><main className="password-reset-page"><section className="password-reset-card"><p className="eyebrow">TEAM ACCESS</p><h1>{changingPassword?'Choose a new password':'Reset your password'}</h1><p>{changingPassword?'Set a new password for your staff account.':'Enter your staff account email and we’ll send a secure reset link if it matches an active account.'}</p><form onSubmit={(event)=>void submit(event)}>{changingPassword?<><label>New password<input type="password" autoComplete="new-password" minLength={10} value={password} onChange={(event)=>setPassword(event.target.value)} required/></label><label>Confirm new password<input type="password" autoComplete="new-password" minLength={10} value={confirmation} onChange={(event)=>setConfirmation(event.target.value)} required/></label></>:<label>Staff account email<input type="email" autoComplete="email" value={email} onChange={(event)=>setEmail(event.target.value)} required/></label>}<button className="button button--dark" disabled={busy}>{busy?'Please wait…':changingPassword?'Update password':'Send reset link'}</button></form>{message&&<p className="password-reset-message success" role="status">{message}{changingPassword&&<> <Link to="/login">Sign in</Link></>}</p>}{error&&<p className="password-reset-message error" role="alert">{error}</p>}<Link className="password-reset-back" to="/login">Back to staff sign in</Link></section></main></PublicLayout>;
}
