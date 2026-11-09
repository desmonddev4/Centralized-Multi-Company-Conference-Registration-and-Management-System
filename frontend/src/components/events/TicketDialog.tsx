import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { eventsApi, type Conference, type TicketCategory } from '../../api/events';
import { useToast } from '../feedback/ToastProvider';
import { activeTickets, money, shortDate } from './eventHelpers';
import './TicketDialog.css';

type Props = { event: Conference; open: boolean; onClose: () => void };

/* Two-step dialog: choose a ticket, then enter attendee details to reserve a place. */
export default function TicketDialog({ event, open, onClose }: Props) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [chosen, setChosen] = useState<TicketCategory | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const close = () => { setChosen(null); setError(''); onClose(); };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setChosen(null); setError(''); onClose(); } };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [open, onClose]);

  if (!open) return null;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!chosen) return;
    setSaving(true); setError('');
    try {
      const registration = await eventsApi.register(event.slug, { ticket_category: chosen.id, full_name: fullName, email, phone });
      showToast({ variant: 'success', title: 'Registration started', message: 'Your attendee details were saved.' });
      navigate('/registrations/' + encodeURIComponent(registration.registration_code));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Registration could not be completed.'); }
    finally { setSaving(false); }
  }

  return <div className="td-backdrop" onClick={close}>
    <div className="td-panel" role="dialog" aria-modal="true" aria-label={chosen ? 'Your details' : 'Select ticket type'} onClick={(e) => e.stopPropagation()}>
      <button type="button" className="td-close" aria-label="Close" onClick={close}>×</button>
      {!chosen ? <>
        <p className="pp-eyebrow">Select ticket type</p>
        <h2 className="td-title">Choose your <em>ticket</em></h2>
        <div className="td-options">{activeTickets(event).map((ticket) => <button type="button" className="td-option" key={ticket.id} disabled={ticket.remaining_quantity <= 0} onClick={() => { setChosen(ticket); setError(''); }}>
          <span className="td-option__info"><strong>{ticket.name}</strong><small>{ticket.remaining_quantity > 0 ? ticket.remaining_quantity + ' available' : 'Sold out'}</small></span>
          <span className="td-option__price">{money(ticket.current_price_minor_units, ticket.currency)}
            {ticket.early_price_minor_units !== null && ticket.early_sales_close_at && <small>Standard {money(ticket.price_minor_units, ticket.currency)} · early fee ends {shortDate(ticket.early_sales_close_at)}</small>}
          </span>
        </button>)}</div>
      </> : <>
        <button type="button" className="td-back" onClick={() => setChosen(null)}>← Change ticket</button>
        <p className="pp-eyebrow">Your details</p>
        <h2 className="td-title">{chosen.name}</h2>
        <p className="td-price">{money(chosen.current_price_minor_units, chosen.currency)}</p>
        {event.registration_url
          ? <a className="pp-btn pp-btn--primary td-submit" href={event.registration_url}>Continue to official registration <span aria-hidden="true">→</span></a>
          : <form onSubmit={submit} className="td-form">
            <label className="pp-field">Full name<input required minLength={3} maxLength={160} autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="First and last name" /></label>
            <label className="pp-field">Email address<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
            <label className="pp-field">Phone number <span>(optional)</span><input type="tel" maxLength={40} autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+233 …" /></label>
            {error && <div className="pp-alert" role="alert">{error}</div>}
            <button className="pp-btn pp-btn--primary td-submit" disabled={saving}>{saving ? 'Reserving your place…' : 'Continue to registration'}{!saving && <span aria-hidden="true">→</span>}</button>
            <p className="td-legal">By continuing you agree to our <Link to="/terms">Terms</Link>, <Link to="/privacy">Privacy Policy</Link> and <Link to="/refund-policy">Refund Policy</Link>.</p>
          </form>}
      </>}
    </div>
  </div>;
}
