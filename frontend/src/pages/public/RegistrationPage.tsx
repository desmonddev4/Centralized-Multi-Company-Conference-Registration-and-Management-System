import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import { eventsApi, type Conference } from '../../api/events';
import { eventRange, money, shortDate } from '../../components/events/eventHelpers';
import './RegistrationPage.css';

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

  useEffect(() => {
    eventsApi.get(eventId)
      .then((value) => {
        setConference(value);
        const available = value.ticket_categories.find((ticket) => ticket.is_active && ticket.remaining_quantity > 0);
        if (available) setSelectedTicket(String(available.id));
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'This conference could not be loaded.'))
      .finally(() => setLoading(false));
  }, [eventId]);

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

  if (loading) return <PublicLayout showFooter={false}><main className="registration-page pp-flow"><div className="reg-state pp-card">Loading conference details…</div></main></PublicLayout>;
  if (!conference) return <PublicLayout showFooter={false}><main className="registration-page pp-flow"><section className="reg-state pp-card">
    <p className="pp-eyebrow">Registration</p>
    <h1>We couldn’t load this conference.</h1>
    <p>{error}</p>
    <Link className="pp-btn pp-btn--primary" to="/events">Browse conferences</Link>
  </section></main></PublicLayout>;

  return <PublicLayout showFooter={false}><main className="registration-page pp-flow">
    <div className="pp-wrap">
      <Link to={'/events/' + conference.slug} className="pp-flow__back">← Back to conference</Link>
      <header className="reg-head">
        <p className="pp-tag"><i aria-hidden="true" />Attendee registration</p>
        <h1 className="pp-title">Save your <em>place.</em></h1>
        <p className="pp-lead">Register for <strong>{conference.title}</strong>. We’ll create a unique code for this registration.</p>
      </header>
      <div className="reg-grid">
        <section className="reg-form pp-card">
          {conference.registration_url
            ? <div className="reg-external">
              <p>Registration and payment for this conference are handled on the official AIPIS website. Continue there to complete your booking.</p>
              <a className="pp-btn pp-btn--primary reg-submit" href={conference.registration_url}>Continue to official registration <span aria-hidden="true">→</span></a>
            </div>
            : <form onSubmit={submit}>
              <fieldset className="reg-tickets">
                <legend>Choose a ticket</legend>
                {tickets.length === 0
                  ? <div className="reg-empty">There are no available ticket types right now.</div>
                  : tickets.map((ticket) => <label className={'reg-ticket' + (selectedTicket === String(ticket.id) ? ' is-selected' : '')} key={ticket.id}>
                    <input type="radio" name="ticket" value={ticket.id} checked={selectedTicket === String(ticket.id)} onChange={(event) => setSelectedTicket(event.target.value)} />
                    <span className="reg-ticket__radio" aria-hidden="true" />
                    <span className="reg-ticket__info"><strong>{ticket.name}</strong><small>{ticket.description || ticket.remaining_quantity + ' places available'}</small></span>
                    <span className="reg-ticket__price">{money(ticket.current_price_minor_units, ticket.currency)}
                      {ticket.early_price_minor_units !== null && ticket.early_sales_close_at && <small>Standard {money(ticket.price_minor_units, ticket.currency)} · early fee ends {shortDate(ticket.early_sales_close_at)}</small>}
                    </span>
                  </label>)}
              </fieldset>
              <fieldset className="reg-details">
                <legend>Your details</legend>
                <label className="pp-field reg-details__wide">Full name<input required minLength={3} maxLength={160} autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="First and last name" /></label>
                <label className="pp-field">Email address<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /><small>We’ll use this for registration updates.</small></label>
                <label className="pp-field">Phone number <span>(optional)</span><input type="tel" maxLength={40} autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+233 …" /></label>
              </fieldset>
              {error && <div className="pp-alert reg-alert" role="alert">{error}</div>}
              <button className="pp-btn pp-btn--primary reg-submit" disabled={saving || tickets.length === 0}>{saving ? 'Reserving your place…' : 'Continue to registration'}{!saving && <span aria-hidden="true">→</span>}</button>
              <p className="reg-privacy">By continuing you agree to our <Link to="/terms">Terms &amp; Conditions</Link>, <Link to="/privacy">Privacy Policy</Link> and <Link to="/refund-policy">Refund Policy</Link>. One registration is created for one attendee; you can register another person separately.</p>
            </form>}
        </section>
        <aside className="reg-summary">
          <p className="reg-summary__eyebrow">Your conference</p>
          <h2>{conference.title}</h2>
          <p>{eventRange(conference)}</p>
          <p>{conference.venue_name || 'Venue details to be announced'}</p>
          <div className="reg-summary__note"><span aria-hidden="true">✓</span><p>{conference.registration_url ? 'Official AIPIS registration is required to complete your booking.' : 'Every attendee gets a unique registration code.'}</p></div>
        </aside>
      </div>
    </div>
  </main></PublicLayout>;
}
