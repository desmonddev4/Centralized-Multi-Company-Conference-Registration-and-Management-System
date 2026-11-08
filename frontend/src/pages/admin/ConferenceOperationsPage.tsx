import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import EmptyState from '../../components/feedback/EmptyState';
import { eventsApi, type AdminRegistration, type Conference, type ReportingData } from '../../api/events';
import './ConferenceOperationsPage.css';

const dateTime = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const money = (amount: number, currency: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount / 100);

export default function ConferenceOperationsPage() {
  const { conferenceSlug = '' } = useParams();
  const [conference, setConference] = useState<Conference | null>(null);
  const [report, setReport] = useState<ReportingData | null>(null);
  const [registrations, setRegistrations] = useState<AdminRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([eventsApi.get(conferenceSlug), eventsApi.reporting('all', conferenceSlug), eventsApi.registrations()])
      .then(([event, summary, rows]) => {
        if (!active) return;
        setConference(event);
        setReport(summary);
        setRegistrations(rows.filter(row => row.conference_slug === conferenceSlug));
      })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load conference operations.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [conferenceSlug]);

  const recent = useMemo(() => registrations.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8), [registrations]);
  const activeRegistrationCount = registrations.filter(row => row.status !== 'cancelled' && row.status !== 'expired').length;
  const ticketCapacity = conference?.ticket_categories.reduce((sum, ticket) => sum + ticket.quantity_available, 0) ?? 0;
  const capacity = conference?.capacity ?? ticketCapacity;
  const occupancy = capacity ? Math.min(100, Math.round(activeRegistrationCount * 100 / capacity)) : 0;

  return <AdminLayout title="Conference operations" eyebrow="EVENT MANAGEMENT">
    <div className="conference-ops-back"><Link to="/admin/events">← All conferences</Link></div>
    {error && <div className="conference-ops-error" role="alert"><strong>Couldn’t load this conference.</strong><span>{error}</span></div>}
    {loading && !conference ? <div className="conference-ops-loading">Loading conference operations…</div> : conference && report && <>
      <header className="conference-ops-hero"><div><div className="conference-ops-company">{conference.company_name} <span className={`conference-ops-status ${conference.status}`}>{conference.status}</span></div><h1>{conference.title}</h1><p>{conference.venue_name || 'Venue to be confirmed'}{conference.venue_address ? ` · ${conference.venue_address}` : ''}</p></div><div className="conference-ops-dates"><span>CONFERENCE SCHEDULE</span><strong>{dateTime(conference.starts_at)}</strong><small>Ends {dateTime(conference.ends_at)}</small></div></header>
      <div className="conference-ops-program-link"><Link to={`/admin/program?conference=${encodeURIComponent(conference.slug)}`}>Manage agenda and sessions →</Link></div>
      <section className="conference-ops-metrics" aria-label="Conference metrics">
        <article><span>Registrations</span><strong>{report.summary.registration_count.toLocaleString()}</strong><small>{report.summary.confirmed_count.toLocaleString()} confirmed</small></article>
        <article><span>Check-ins</span><strong>{report.summary.check_in_count.toLocaleString()}</strong><small>{report.summary.check_in_rate}% of confirmed</small></article>
        <article><span>Capacity used</span><strong>{capacity ? `${occupancy}%` : '—'}</strong><small>{capacity ? `${Math.max(0, capacity - activeRegistrationCount)} places remaining` : 'No capacity limit set'}</small><div className="conference-ops-progress"><i style={{ width: `${occupancy}%` }}/></div></article>
        <article><span>Gross revenue</span><strong>{report.financial_access && report.summary.gross_revenue.length ? report.summary.gross_revenue.map(row => money(row.amount_minor_units, row.currency)).join(' · ') : report.financial_access ? '—' : 'Restricted'}</strong><small>{report.financial_access ? 'Paid registrations' : 'Finance permission required'}</small></article>
      </section>
      <div className="conference-ops-grid">
        <section className="conference-ops-card"><header><div><h2>Ticket availability</h2><p>Sales remaining by ticket category</p></div><span>{conference.ticket_categories.length} types</span></header>
          {conference.ticket_categories.length ? <div className="conference-ops-tickets">{conference.ticket_categories.map(ticket => { const used = ticket.quantity_available - ticket.remaining_quantity; const percent = ticket.quantity_available ? Math.round(used * 100 / ticket.quantity_available) : 0; return <article key={ticket.id}><div><strong>{ticket.name}</strong><span>{money(ticket.current_price_minor_units, ticket.currency)}</span></div>{ticket.early_price_minor_units!==null&&ticket.early_sales_close_at&&<small>Standard {money(ticket.price_minor_units,ticket.currency)} · early through {new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric'}).format(new Date(ticket.early_sales_close_at))}</small>}<div className="conference-ops-ticket-bar"><i style={{ width: `${percent}%` }}/></div><small>{ticket.remaining_quantity.toLocaleString()} of {ticket.quantity_available.toLocaleString()} left</small></article>; })}</div> : <EmptyState title="No ticket categories" message="Add ticket categories when editing this conference."/>}
        </section>
        <section className="conference-ops-card conference-ops-schedule"><header><div><h2>Registration window</h2><p>Registration availability dates</p></div></header><dl><div><dt>Opens</dt><dd>{conference.registration_opens_at ? dateTime(conference.registration_opens_at) : 'Not scheduled'}</dd></div><div><dt>Closes</dt><dd>{conference.registration_closes_at ? dateTime(conference.registration_closes_at) : 'Not scheduled'}</dd></div><div><dt>Conference capacity</dt><dd>{conference.capacity ? conference.capacity.toLocaleString() : 'Unlimited'}</dd></div></dl><Link className="conference-ops-action" to="/admin/registrations">View all registrations <span>→</span></Link></section>
      </div>
      <section className="conference-ops-card conference-ops-recent"><header><div><h2>Recent registrations</h2><p>Latest attendee activity for this conference</p></div><Link to="/admin/registrations">View registrations →</Link></header>
        {recent.length ? <div className="conference-ops-table-wrap"><table><thead><tr><th>ATTENDEE</th><th>REGISTRATION CODE</th><th>TICKET</th><th>STATUS</th><th>PAYMENT</th><th>REGISTERED</th></tr></thead><tbody>{recent.map(row => <tr key={row.registration_code}><td><strong>{row.full_name}</strong><small>{row.email}</small></td><td>{row.registration_code}</td><td>{row.ticket_category_name}</td><td><span className={`conference-ops-reg-status ${row.status}`}>{row.status.replace(/_/g, ' ')}</span></td><td>{row.payment_method === 'none' ? '—' : row.payment_method.toUpperCase()}</td><td>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(row.created_at))}</td></tr>)}</tbody></table></div> : <EmptyState title="No registrations yet" message="Registrations for this conference will appear here."/>}
      </section>
    </>}
  </AdminLayout>;
}
