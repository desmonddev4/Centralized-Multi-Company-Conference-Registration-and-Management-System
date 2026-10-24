import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { operationsApi, type SystemReadiness } from '../../api/events';
import './SystemReadinessPage.css';

const statusLabel=(value:SystemReadiness['overall_status'])=>value==='ok'?'Ready':value==='warning'?'Needs attention':'Action required';

export default function SystemReadinessPage(){
  const [data,setData]=useState<SystemReadiness|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [checkedAt,setCheckedAt]=useState('');
  const load=useCallback(async()=>{setLoading(true);setError('');try{setData(await operationsApi.readiness());setCheckedAt(new Date().toISOString());}catch(cause){setError(cause instanceof Error?cause.message:'Could not load system readiness.');}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  return <AdminLayout title="System readiness" eyebrow="PLATFORM OPERATIONS">
    <div className="readiness-intro"><p>Review service configuration before opening registrations or running a live conference. Secret values are never displayed here.</p><button className="button button--quiet" onClick={()=>void load()} disabled={loading}>↻ Refresh checks</button></div>
    {error&&<div className="readiness-error" role="alert">{error}</div>}
    {loading&&!data?<div className="readiness-loading">Checking system configuration…</div>:data&&<>
      <header className={`readiness-overview ${data.overall_status}`}><div><span>OVERALL STATUS</span><h1>{statusLabel(data.overall_status)}</h1><p>{data.overall_status==='ok'?'All checked services report ready.':data.overall_status==='warning'?'Review the warnings before relying on production workflows.':'One or more required services need attention.'}</p></div><small>Checked {checkedAt?new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(checkedAt)):'—'}</small></header>
      <section className="readiness-list" aria-label="System checks">{data.checks.map(check=><article className="readiness-check" key={check.key}><span className={`readiness-indicator ${check.status}`} aria-label={check.status}/><div><h2>{check.label}</h2><p>{check.detail}</p></div><strong className={`readiness-check-status ${check.status}`}>{check.status==='ok'?'Ready':check.status==='warning'?'Review':'Action required'}</strong></article>)}</section>
      <div className="readiness-help"><div><h2>Configuration and operations</h2><p>Provider credentials and email server settings are managed in the backend environment. Public platform details can be edited in Settings.</p></div><Link to="/admin/settings">Open platform settings →</Link></div>
    </>}
  </AdminLayout>;
}
