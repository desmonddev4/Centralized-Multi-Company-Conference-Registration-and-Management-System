import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import { accountsApi } from '../../api/events';
import './LoginPage.css';

export default function LoginPage() {
  const navigate=useNavigate(); const location=useLocation(); const [username,setUsername]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);const[csrfReady,setCsrfReady]=useState(false);
  useEffect(()=>{void accountsApi.session().catch(()=>undefined).finally(()=>setCsrfReady(true));},[]);
  async function submit(event:FormEvent){event.preventDefault();setBusy(true);setError('');try{await accountsApi.login(username,password);const from=(location.state as {from?:string}|null)?.from;navigate(from||'/admin',{replace:true});}catch(e){setError(e instanceof Error?e.message:'Sign-in failed.');}finally{setBusy(false);}}
  return <PublicLayout><main className="staff-login"><section className="staff-login-card"><p className="eyebrow">TEAM ACCESS</p><h1>Sign in</h1><p>Use your staff account to access conference operations.</p><form onSubmit={(e)=>void submit(e)}><label>Username<input value={username} onChange={(e)=>setUsername(e.target.value)} autoComplete="username" required/></label><label>Password<input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} autoComplete="current-password" required/></label>{error&&<div className="staff-login-error" role="alert">{error}</div>}<button className="button button--dark" disabled={busy||!csrfReady}>{!csrfReady?'Preparing secure sign-in…':busy?'Signing in…':'Sign in'}</button></form><Link to="/password-reset">Forgot your password?</Link></section></main></PublicLayout>;
}
