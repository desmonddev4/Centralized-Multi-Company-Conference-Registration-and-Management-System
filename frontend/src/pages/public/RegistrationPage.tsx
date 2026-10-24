import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import { eventsApi, type Conference, type TicketCategory } from '../../api/events';
import './RegistrationPage.css';

function money(ticket: TicketCategory) { return ticket.price_minor_units === 0 ? 'Free' : ticket.currency + ' ' + (ticket.price_minor_units / 100).toFixed(2); }
export default function RegistrationPage() {
  const { eventId = '' } = useParams();
  const navigate = useNavigate();
  const [conference, setConference] = useState<Conference | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { eventsApi.get(eventId).then((value) => { setConference(value); const available = value.ticket_categories.find((ticket) => ticket.is_active && ticket.remaining_quantity > 0); if (available) setSelectedTicket(String(available.id)); }).catch((cause) => setError(cause instanceof Error ? cause.message : 'This conference could not be loaded.')).finally(() => setLoading(false)); }, [eventId]);
  const tickets = conference?.ticket_categories.filter((ticket) => ticket.is_active && ticket.remaining_quantity > 0) || [];
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTicket) { setError('Choose an available ticket type.'); return; }
    setSaving(true); setError('');
    try {
      const registration = await eventsApi.register(eventId, { ticket_category: Number(selectedTicket), full_name: fullName, email, phone });
      navigate('/registrations/' + encodeURIComponent(registration.registration_code));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Registration could not be completed.'); }
    finally { setSaving(false); }
  }
  if (loading) return <PublicLayout><main className="registration-loading">Loading conference details…</main></PublicLayout>;
  if (!conference) return <PublicLayout><main className="registration-error"><p className="eyebrow">REGISTRATION</p><h1>We couldn’t load this conference.</h1><p>{error}</p><Link to="/events">Browse conferences</Link></main></PublicLayout>;
  return <PublicLayout><main className="registration-page"><Link to={'/events/'+conference.slug} className="registration-back">← Back to conference</Link><div className="registration-grid"><section className="registration-main"><p className="eyebrow">ATTENDEE REGISTRATION</p><h1>Save your place.</h1><p className="registration-lede">Register for <strong>{conference.title}</strong>. We’ll create a unique code for this registration.</p><form onSubmit={submit}>
    <fieldset className="registration-ticket-set"><legend>Choose a ticket</legend>{tickets.length===0?<div className="no-tickets">There are no available ticket types right now.</div>:tickets.map((ticket)=><label className={'registration-ticket'+(selectedTicket===String(ticket.id)?' selected':'')} key={ticket.id}><input type="radio" name="ticket" value={ticket.id} checked={selectedTicket===String(ticket.id)} onChange={(event)=>setSelectedTicket(event.target.value)}/><span className="registration-ticket__radio"/><span className="registration-ticket__info"><strong>{ticket.name}</strong><small>{ticket.description||ticket.remaining_quantity+' places available'}</small></span><span className="registration-ticket__price">{money(ticket)}</span></label>)}</fieldset>
    <fieldset className="attendee-fields"><legend>Your details</legend><label className="registration-field">Full name<input required minLength={3} maxLength={160} autoComplete="name" value={fullName} onChange={(event)=>setFullName(event.target.value)} placeholder="First and last name"/></label><label className="registration-field">Email address<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={(event)=>setEmail(event.target.value)} placeholder="you@example.com"/><small>We’ll use this for registration updates.</small></label><label className="registration-field">Phone number <span>(optional)</span><input type="tel" maxLength={40} autoComplete="tel" value={phone} onChange={(event)=>setPhone(event.target.value)} placeholder="+233 …"/></label></fieldset>
    {error&&<div className="registration-alert" role="alert">{error}</div>}<button className="button button--dark registration-submit" disabled={saving||tickets.length===0}>{saving?'Reserving your place…':'Continue to registration'}<span>→</span></button><p className="registration-privacy">One registration is created for one attendee. You can register another person separately.</p>
  </form></section><aside className="registration-summary"><p className="eyebrow">YOUR CONFERENCE</p><h2>{conference.title}</h2><p>{new Intl.DateTimeFormat(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(conference.starts_at))}</p><p>{conference.venue_name||'Venue details to be announced'}</p><div className="summary-note"><span>✓</span><p>Every attendee gets a unique registration code.</p></div></aside></div></main></PublicLayout>;
}
