import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import { eventsApi, type Registration } from '../../api/events';
import './CheckoutPage.css';

export default function CheckoutPage() {
  const { registrationCode = '' } = useParams();
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { eventsApi.registration(registrationCode).then(setRegistration).catch((e) => setError(e instanceof Error ? e.message : 'Could not load registration.')); }, [registrationCode]);
  async function pay() {
    setBusy(true); setError('');
    try { const payment = await eventsApi.initializePayment(registrationCode); if (!payment.authorization_url) throw new Error('Paystack did not return a checkout link.'); window.location.assign(payment.authorization_url); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not start payment.'); setBusy(false); }
  }
  const pending = registration?.status === 'pending_payment';
  return <PublicLayout><main className="checkout-page"><Link className="checkout-back" to={registration ? '/registrations/' + registration.registration_code : '/events'}>← Back to registration</Link><section className="checkout-card"><p className="eyebrow">SECURE CHECKOUT</p><h1>Complete your payment</h1>{!registration ? <p>{error || 'Loading registration details…'}</p> : <><p className="checkout-intro">Your ticket reservation is held for a limited time while payment is completed.</p><dl className="checkout-summary"><div><dt>Attendee</dt><dd>{registration.full_name}</dd></div><div><dt>Conference</dt><dd>{registration.conference_title}</dd></div><div><dt>Ticket</dt><dd>{registration.ticket_category_name}</dd></div><div><dt>Amount due</dt><dd>{registration.currency} {(registration.amount_due_minor_units / 100).toFixed(2)}</dd></div></dl>{pending ? <><button className="button button--dark checkout-submit" onClick={() => void pay()} disabled={busy}>{busy ? 'Connecting to Paystack…' : 'Pay securely with Paystack'}</button><p className="checkout-methods">Pay by card or supported mobile money account. Payment details are handled securely by Paystack.</p></> : <div className="checkout-state"><strong>{registration.status === 'confirmed' ? 'Payment complete' : registration.status === 'payment_review' ? 'Payment needs review' : 'This reservation is no longer awaiting payment'}</strong><p>Registration status: {registration.status.replace('_', ' ')}.</p><Link to={'/registrations/' + registration.registration_code}>View registration</Link></div>}</>}{error && <p className="checkout-error" role="alert">{error}</p>}</section></main></PublicLayout>;
}
