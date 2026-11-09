import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import { eventsApi, type Registration } from '../../api/events';
import './CheckoutPage.css';

const money = (minor: number, currency: string) => new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency,
}).format(minor / 100);

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
  return <PublicLayout><main className="checkout-page pp-flow"><Link className="checkout-back pp-flow__back" to={registration ? '/registrations/' + registration.registration_code : '/events'}>← Back to registration</Link><section className="checkout-card"><p className="eyebrow">SECURE CHECKOUT</p><h1>Complete your payment</h1>{!registration ? <p>{error || 'Loading registration details…'}</p> : <><p className="checkout-intro">Your ticket reservation is held for a limited time while payment is completed.</p><dl className="checkout-summary"><div><dt>Attendee</dt><dd>{registration.full_name}</dd></div><div><dt>Conference</dt><dd>{registration.conference_title}</dd></div><div><dt>Ticket</dt><dd>{registration.ticket_category_name}</dd></div><div><dt>Ticket price</dt><dd>{money(registration.amount_due_minor_units, registration.currency)}</dd></div><div><dt>Paystack charge</dt><dd>{money(registration.paystack_amount_minor_units, registration.paystack_currency)}</dd></div></dl>{registration.paystack_exchange_rate && <p className="checkout-methods">Converted at 1 USD = GHS {Number(registration.paystack_exchange_rate).toFixed(2)}. Paystack will charge the GHS amount shown above.</p>}{pending ? <><button className="button button--dark checkout-submit" onClick={() => void pay()} disabled={busy}>{busy ? 'Connecting to Paystack…' : `Pay ${money(registration.paystack_amount_minor_units, registration.paystack_currency)} securely with Paystack`}</button><p className="checkout-methods">Pay by card or supported mobile money account. Payment details are handled securely by Paystack. By paying you agree to our <Link to="/terms">Terms &amp; Conditions</Link> and <Link to="/refund-policy">Refund Policy</Link>.</p></> : <div className="checkout-state"><strong>{registration.status === 'confirmed' ? 'Payment complete' : registration.status === 'payment_review' ? 'Payment needs review' : 'This reservation is no longer awaiting payment'}</strong><p>Registration status: {registration.status.replace('_', ' ')}.</p><Link to={'/registrations/' + registration.registration_code}>View registration</Link></div>}</>}{error && <p className="checkout-error" role="alert">{error}</p>}</section></main></PublicLayout>;
}
