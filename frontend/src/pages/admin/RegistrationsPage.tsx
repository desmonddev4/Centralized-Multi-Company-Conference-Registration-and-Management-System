import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import EmptyState from '../../components/feedback/EmptyState';
import StatusBadge from '../../components/feedback/StatusBadge';
import { eventsApi, type AdminRegistration, type RegistrationStatus } from '../../api/events';
import './RegistrationsPage.css';

function label(status: RegistrationStatus) { return status.replace('_',' '); }
function tone(status: RegistrationStatus) { return status==='confirmed'?'positive':status==='pending_payment'?'warning':status==='expired'||status==='cancelled'?'negative':status==='payment_review'?'warning':'neutral'; }
function amount(registration: AdminRegistration) { return registration.amount_due_minor_units===0?'Free':registration.currency+' '+(registration.amount_due_minor_units/100).toFixed(2); }
function paymentMethod(registration: AdminRegistration) { return registration.payment_method==='momo'?'MoMo':registration.payment_method==='cash'?'Cash':registration.payment_method==='paystack'?'Paystack':'—'; }
export default function RegistrationsPage() {
  const [rows,setRows]=useState<AdminRegistration[]>([]);
  const [status,setStatus]=useState('all');
  const [search,setSearch]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const load=useCallback(async()=>{setLoading(true);setError('');try{setRows(await eventsApi.registrations(status==='all'?undefined:status));}catch(cause){setError(cause instanceof Error?cause.message:'Could not load registrations.');}finally{setLoading(false);}},[status]);
  useEffect(()=>{void load();},[load]);
  const filtered=useMemo(()=>rows.filter((row)=>(row.full_name+' '+row.email+' '+row.registration_code+' '+row.conference_title+' '+row.company_name).toLowerCase().includes(search.toLowerCase())),[rows,search]);
  return <AdminLayout title="Registrations" eyebrow="ATTENDEE MANAGEMENT"><div className="registrations-toolbar"><div className="registration-search"><span>⌕</span><input aria-label="Search registrations" placeholder="Search name, code, event or email…" value={search} onChange={(event)=>setSearch(event.target.value)}/></div><label className="registration-filter"><span>Status</span><select value={status} onChange={(event)=>setStatus(event.target.value)}><option value="all">All statuses</option><option value="confirmed">Confirmed</option><option value="pending_payment">Pending payment</option><option value="payment_review">Payment review</option><option value="cancelled">Cancelled</option><option value="expired">Expired</option></select></label><button className="button button--quiet" onClick={()=>void load()} disabled={loading}>↻ Refresh</button></div>
    {error&&<div className="registrations-error" role="alert"><strong>Couldn’t load registrations.</strong><span>{error}</span></div>}
    <section className="registration-list-card"><header><div><h2>All registrations</h2><p>{filtered.length} {filtered.length===1?'registration':'registrations'}</p></div></header>{loading?<div className="registration-list-loading">Loading registrations…</div>:filtered.length===0?<EmptyState title="No registrations found" message={search?'Try a different search.':'New registrations will appear here.'}/>:<div className="registration-list-scroll"><table className="registration-list"><thead><tr><th>ATTENDEE</th><th>REGISTRATION CODE</th><th>CONFERENCE</th><th>TICKET</th><th>AMOUNT</th><th>PAYMENT</th><th>STATUS</th><th>REGISTERED</th></tr></thead><tbody>{filtered.map((row)=><tr key={row.registration_code}><td><strong>{row.full_name}</strong><small>{row.email}{row.phone?' · '+row.phone:''}</small></td><td><Link className="registration-code-link" to={`/admin/registrations/${encodeURIComponent(row.registration_code)}`}><code>{row.registration_code}</code></Link></td><td><strong>{row.conference_title}</strong><small>{row.company_name}</small></td><td>{row.ticket_category_name}</td><td>{amount(row)}</td><td>{paymentMethod(row)}{row.payment_received_at&&<small>{new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(row.payment_received_at))}</small>}</td><td><StatusBadge status={label(row.status)} tone={tone(row.status)}/></td><td>{new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric'}).format(new Date(row.created_at))}</td></tr>)}</tbody></table></div>}</section>
  </AdminLayout>;
}
