import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import { eventsApi, type Payment } from '../../api/events';
import './PaymentResultPage.css';

export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const reference = params.get('reference') || params.get('trxref') || '';
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    if (!reference) { setError('The payment reference is missing.'); setChecking(false); return; }
    eventsApi.verifyPayment(reference).then(setPayment).catch((e) => setError(e instanceof Error ? e.message : 'Could not verify payment.')).finally(() => setChecking(false));
  }, [reference]);
  const success = payment?.status === 'succeeded';
  const review = payment?.status === 'review';
  return <PublicLayout><main className="payment-result-page"><section className="payment-result-card"><div className={'payment-result-mark '+(success?'success':review?'review':'')}>{checking?'…':success?'✓':review?'!':'×'}</div><p className="eyebrow">PAYMENT STATUS</p><h1>{checking?'Verifying your payment…':success?'Payment confirmed':review?'Payment received':payment?'Payment not completed':'Unable to verify payment'}</h1><p>{checking?'We are checking the transaction directly with Paystack.':success?'Your payment is verified. Your registration is confirmed.':review?'The payment was received but requires a quick ticket availability review. Please keep your registration code.':error||'No successful payment was confirmed. You can retry while your ticket reservation is active.'}</p>{payment&&<div className="payment-result-reference"><span>PAYMENT REFERENCE</span><strong>{payment.reference}</strong></div>}{payment?.registration_code&&<Link className="button button--dark" to={'/registrations/'+payment.registration_code}>View registration</Link>}{!success&&!review&&payment?.registration_code&&<Link className="payment-result-retry" to={'/checkout/'+payment.registration_code}>Return to checkout</Link>}<Link className="payment-result-retry" to="/events">Browse conferences</Link></section></main></PublicLayout>;
}
