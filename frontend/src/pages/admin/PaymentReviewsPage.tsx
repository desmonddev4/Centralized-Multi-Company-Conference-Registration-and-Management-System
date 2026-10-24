import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import EmptyState from '../../components/feedback/EmptyState';
import { eventsApi, type PaymentReview } from '../../api/events';
import './PaymentReviewsPage.css';

const money=(minor:number,currency:string)=>`${currency} ${(minor/100).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const paidDate=(value:string)=>new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value));

export default function PaymentReviewsPage(){
  const [items,setItems]=useState<PaymentReview[]>([]);
  const [loading,setLoading]=useState(true);
  const [busyCode,setBusyCode]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [cancelTarget,setCancelTarget]=useState<PaymentReview|null>(null);
  const [cancelReason,setCancelReason]=useState('');
  const [refundFollowup,setRefundFollowup]=useState<PaymentReview|null>(null);
  const load=useCallback(async()=>{setLoading(true);setError('');try{setItems(await eventsApi.paymentReviews());}catch(cause){setError(cause instanceof Error?cause.message:'Could not load payment reviews.');}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);

  async function resolve(item:PaymentReview,action:'confirm'|'cancel',reason=''){
    setBusyCode(item.registration_code);setError('');setNotice('');
    try{
      const result=await eventsApi.resolvePaymentReview(item.registration_code,{action,reason});
      setNotice(result.detail);
      setRefundFollowup(action==='cancel'?item:null);
      setCancelTarget(null);setCancelReason('');
      await load();
    }catch(cause){setError(cause instanceof Error?cause.message:'Could not resolve this payment review.');}
    finally{setBusyCode('');}
  }
  async function submitCancellation(event:FormEvent){event.preventDefault();if(!cancelTarget)return;await resolve(cancelTarget,'cancel',cancelReason.trim());}
  function refundLink(item:PaymentReview){const query=new URLSearchParams({registration_code:item.registration_code,amount:(item.amount_due_minor_units/100).toFixed(2),reason:'Capacity unavailable after payment review'});return '/admin/refunds?'+query.toString();}

  const totals=items.reduce<Record<string,number>>((result,item)=>{result[item.currency]=(result[item.currency]||0)+item.amount_due_minor_units;return result;},{});
  return <AdminLayout title="Payment reviews" eyebrow="FINANCE OPERATIONS"><section className="payment-reviews-page">
    <header className="payment-reviews-intro"><div><h2>Payments that need a decision</h2><p>These charges were verified, but the attendee’s ticket could not be confirmed at the time. Confirm only after a place is available, or cancel and arrange a refund.</p></div><button className="button button--quiet" onClick={()=>void load()} disabled={loading||Boolean(busyCode)}>{loading?'Refreshing…':'Refresh queue ↻'}</button></header>
    <div className="payment-review-summary"><article><span>Awaiting decision</span><strong>{items.length}</strong><small>Verified charges</small></article><article><span>Value under review</span><strong>{Object.keys(totals).length?Object.entries(totals).map(([currency,total])=>money(total,currency)).join(' · '):'—'}</strong><small>Across currencies</small></article><article><span>Decision path</span><strong>Confirm or cancel</strong><small>Confirmation checks ticket capacity</small></article></div>
    {error&&<div className="payment-review-alert" role="alert"><strong>Couldn’t complete the request.</strong><span>{error}</span></div>}
    {notice&&<div className="payment-review-notice" role="status"><span>{notice}</span>{refundFollowup&&<Link to={refundLink(refundFollowup)}>Continue to record the refund →</Link>}</div>}
    <section className="payment-review-list"><header><div><h2>Review queue</h2><p>{items.length} {items.length===1?'registration':'registrations'} need attention</p></div><span className="payment-review-live"><i/> LIVE QUEUE</span></header>
      {loading?<div className="payment-review-loading">Loading verified payments…</div>:items.length===0?<EmptyState title="No payment reviews" message="Verified payments that need a capacity decision will appear here."/>:<div className="payment-review-table-wrap"><table className="payment-review-table"><thead><tr><th>ATTENDEE</th><th>CONFERENCE</th><th>PAYMENT</th><th>AMOUNT</th><th>RECEIVED</th><th>DECISION</th></tr></thead><tbody>{items.map(item=><tr key={item.registration_code}><td><strong>{item.full_name}</strong><small>{item.email}</small><code>{item.registration_code}</code></td><td><strong>{item.conference_title}</strong><small>{item.company_name} · {item.ticket_category_name}</small></td><td><code>{item.payment_reference}</code><small>Paystack · {item.paystack_transaction_id}</small></td><td className="payment-review-amount">{money(item.amount_due_minor_units,item.currency)}</td><td>{paidDate(item.payment_received_at)}</td><td><div className="payment-review-actions"><button className="button button--confirm" disabled={Boolean(busyCode)} onClick={()=>{if(window.confirm(`Confirm ${item.full_name} for ${item.conference_title}? The system will recheck ticket capacity.`))void resolve(item,'confirm');}}>{busyCode===item.registration_code?'Saving…':'Confirm ticket'}</button><button className="button button--cancel" disabled={Boolean(busyCode)} onClick={()=>{setCancelTarget(item);setCancelReason('');setError('');}}>Cancel registration</button></div></td></tr>)}</tbody></table></div>}
    </section>
    {cancelTarget&&<div className="payment-review-modal-backdrop"><form className="payment-review-modal" onSubmit={event=>void submitCancellation(event)}><header><div><span>PAYMENT REVIEW</span><h2>Cancel this registration?</h2></div><button type="button" aria-label="Close" onClick={()=>setCancelTarget(null)}>×</button></header><p><strong>{cancelTarget.full_name}</strong> will lose this ticket allocation. The verified payment remains available for a refund request.</p><label>Reason for cancellation<textarea value={cancelReason} onChange={event=>setCancelReason(event.target.value)} minLength={5} maxLength={300} required rows={3} placeholder="For example: ticket capacity is unavailable"/></label><div className="payment-review-modal-warning">This action cancels the registration. You’ll then need to submit the refund from the Refunds page.</div>{error&&<div className="payment-review-alert" role="alert">{error}</div>}<footer><button type="button" className="button button--quiet" onClick={()=>setCancelTarget(null)} disabled={Boolean(busyCode)}>Keep in queue</button><button className="button button--cancel-solid" disabled={Boolean(busyCode)}>{busyCode?'Cancelling…':'Cancel registration'}</button></footer></form></div>}
  </section></AdminLayout>;
}
