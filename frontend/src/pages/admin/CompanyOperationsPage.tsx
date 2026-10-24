import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import EmptyState from '../../components/feedback/EmptyState';
import { eventsApi, type AdminRegistration, type Company, type Conference } from '../../api/events';
import './CompanyOperationsPage.css';

const date = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));

export default function CompanyOperationsPage() {
  const { companyId = '' } = useParams();
  const [company, setCompany] = useState<Company | null>(null);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [registrations, setRegistrations] = useState<AdminRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([eventsApi.companies(), eventsApi.list(), eventsApi.registrations()])
      .then(([companies, events, rows]) => {
        if (!active) return;
        const selected = companies.find(item => item.id === Number(companyId));
        if (!selected) { setError('Company not found or you do not have access to its details.'); return; }
        const companyEvents = events.filter(event => event.company === selected.id);
        const companySlugs = new Set(companyEvents.map(event => event.slug));
        setCompany(selected);
        setConferences(companyEvents);
        setRegistrations(rows.filter(row => companySlugs.has(row.conference_slug)));
      })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load company operations.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [companyId]);

  const conferenceBySlug = useMemo(() => new Map(conferences.map(event => [event.slug, event])), [conferences]);
  const recent = useMemo(() => registrations.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 10), [registrations]);
  const activeRegistrations = registrations.filter(row => row.status !== 'cancelled' && row.status !== 'expired').length;
  const confirmed = registrations.filter(row => row.status === 'confirmed').length;
  const checkInReady = conferences.filter(event => event.status === 'published').length;

  return <AdminLayout title="Company operations" eyebrow="GROUP MANAGEMENT">
    <div className="company-ops-back"><Link to="/admin/companies">← Company directory</Link></div>
    {error && <div className="company-ops-error" role="alert">{error}</div>}
    {loading ? <div className="company-ops-loading">Loading company operations…</div> : company && <>
      <header className="company-ops-hero"><div className="company-ops-brand">{company.logo_url ? <img src={company.logo_url} alt=""/> : <span>{company.name.trim().slice(0, 1).toUpperCase()}</span>}<div><p>COMPANY WORKSPACE</p><h1>{company.name}</h1><small>{company.slug} · {company.is_active ? 'Active' : 'Inactive'}</small></div></div><Link to="/admin/events" className="company-ops-primary">Manage conferences <span>→</span></Link></header>
      <section className="company-ops-metrics"><article><span>Conferences</span><strong>{conferences.length}</strong><small>{checkInReady} published</small></article><article><span>Registrations</span><strong>{registrations.length.toLocaleString()}</strong><small>{activeRegistrations.toLocaleString()} active</small></article><article><span>Confirmed attendees</span><strong>{confirmed.toLocaleString()}</strong><small>Across this company’s conferences</small></article><article><span>Next conference</span><strong className="company-ops-next">{conferences.filter(event => new Date(event.starts_at).getTime() >= Date.now()).sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0]?.title ?? 'None scheduled'}</strong><small>{conferences.filter(event => new Date(event.starts_at).getTime() >= Date.now()).sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0] ? date(conferences.filter(event => new Date(event.starts_at).getTime() >= Date.now()).sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0].starts_at) : 'Create a conference to get started'}</small></article></section>
      <section className="company-ops-card"><header><div><h2>Company conferences</h2><p>Operational status and upcoming dates</p></div><span>{conferences.length} total</span></header>
        {conferences.length ? <div className="company-ops-table-wrap"><table><thead><tr><th>CONFERENCE</th><th>DATE</th><th>REGISTRATIONS</th><th>STATUS</th><th/></tr></thead><tbody>{conferences.slice().sort((a, b) => a.starts_at.localeCompare(b.starts_at)).map(event => { const count = registrations.filter(row => row.conference_slug === event.slug).length; return <tr key={event.slug}><td><strong>{event.title}</strong><small>{event.venue_name || 'Venue to be confirmed'}</small></td><td>{date(event.starts_at)}</td><td>{count.toLocaleString()}</td><td><span className={`company-ops-status ${event.status}`}>{event.status}</span></td><td><Link to={`/admin/events/${encodeURIComponent(event.slug)}/operations`}>Open operations →</Link></td></tr>; })}</tbody></table></div> : <EmptyState title="No conferences yet" message="Create a conference and assign it to this company."/>}
      </section>
      <section className="company-ops-card company-ops-recent"><header><div><h2>Recent registrations</h2><p>Latest attendee activity across the company</p></div><Link to="/admin/registrations">All registrations →</Link></header>
        {recent.length ? <div className="company-ops-table-wrap"><table><thead><tr><th>ATTENDEE</th><th>CONFERENCE</th><th>REGISTRATION CODE</th><th>STATUS</th><th>REGISTERED</th></tr></thead><tbody>{recent.map(row => <tr key={row.registration_code}><td><strong>{row.full_name}</strong><small>{row.email}</small></td><td>{conferenceBySlug.get(row.conference_slug)?.title ?? row.conference_title}</td><td>{row.registration_code}</td><td><span className={`company-ops-status ${row.status}`}>{row.status.replace(/_/g, ' ')}</span></td><td>{date(row.created_at)}</td></tr>)}</tbody></table></div> : <EmptyState title="No registrations yet" message="New registrations for this company will appear here."/>}
      </section>
    </>}
  </AdminLayout>;
}
