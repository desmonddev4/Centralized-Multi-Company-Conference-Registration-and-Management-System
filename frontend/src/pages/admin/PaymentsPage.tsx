import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import EmptyState from '../../components/feedback/EmptyState';
import StatusBadge from '../../components/feedback/StatusBadge';
import { eventsApi, type Payment } from '../../api/events';
import './PaymentsPage.css';

const tone = (s: Payment['status']) => s === 'succeeded' ? 'positive' : s === 'failed' || s === 'abandoned' ? 'negative' : s === 'review' ? 'warning' : 'neutral';
export default function PaymentsPage() {
  const [items, setItems] = useState<Payment[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setItems(await eventsApi.payments()); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load payments.'); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  return <AdminLayout title="Payments" eyebrow="FINANCE"><div className="payments-toolbar"><p>Online payment attempts recorded for attendee registrations.</p><button className="button button--quiet" disabled={loading} onClick={() => void load()}>↻ Refresh</button></div>{error&&<div className="payments-error" role="alert">{error}</div>}<section className="payments-card"><header><div><h2>Payment activity</h2><p>{items.length} {items.length===1?'payment':'payments'}</p></div></header>{loading?<p className="payments-loading">Loading payment activity…</p>:items.length===0?<EmptyState title="No online payments yet" message="Paystack payment attempts will appear here."/>:<div className="payments-table-scroll"><table className="payments-table"><thead><tr><th>REFERENCE</th><th>REGISTRATION</th><th>AMOUNT</th><th>STATUS</th><th>CREATED</th></tr></thead><tbody>{items.map(p=><tr key={p.reference}><td><code>{p.reference}</code></td><td><code>{p.registration_code}</code></td><td>{p.currency} {(p.amount_minor_units/100).toFixed(2)}</td><td><StatusBadge status={p.status.replace('_',' ')} tone={tone(p.status)}/></td><td>{new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(p.created_at||Date.now()))}</td></tr>)}</tbody></table></div>}</section></AdminLayout>;
}
