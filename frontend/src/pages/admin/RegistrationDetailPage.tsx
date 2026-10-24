import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { eventsApi, type AdminRegistration, type CheckInLookup } from '../../api/events';
import './RegistrationDetailPage.css';

const label = (value: string) => value.replace(/_/g, ' ');
const datetime = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export default function RegistrationDetailPage() {
  const { registrationCode = '' } = useParams();
  const [registration, setRegistration] = useState<AdminRegistration | null>(null);
  const [checkIn, setCheckIn] = useState<CheckInLookup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    eventsApi.registrations().then(async rows => {
      if (!active) return;
      const found = rows.find(row => row.registration_code.toLowerCase() === registrationCode.toLowerCase());
      if (!found) { setError('Registration not found or you do not have access to it.'); return; }
      setRegistration(found);
      try { const result = await eventsApi.checkInLookup(found.registration_code); if (active) setCheckIn(result); } catch { /* check-in details require check-in permission */ }
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load this registration.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [registrationCode]);

  return <AdminLayout title="Registration details" eyebrow="ATTENDEE MANAGEMENT">
    <div className="registration-detail-back"><Link to="/admin/registrations">← All registrations</Link></div>
    {loading && <div className="registration-detail-loading">Loading registration…</div>}
    {error && <div className="registration-detail-error" role="alert">{error}</div>}
    {registration && <>
      <header className="registration-detail-hero"><div><p>UNIQUE REGISTRATION CODE</p><h1>{registration.registration_code}</h1><span className={`registration-detail-status ${registration.status}`}>{label(registration.status)}</span></div><div className="registration-detail-actions"><a href={`/tickets/${encodeURIComponent(registration.registration_code)}`} target="_blank" rel="noreferrer">View ticket ↗</a><Link to={`/staff/check-in?code=${encodeURIComponent(registration.registration_code)}`}>Open check-in ↗</Link></div></header>
      <div className="registration-detail-grid">
        <section className="registration-detail-card"><h2>Attendee</h2><dl><div><dt>Full name</dt><dd>{registration.full_name}</dd></div><div><dt>Email</dt><dd><a href={`mailto:${registration.email}`}>{registration.email}</a></dd></div><div><dt>Phone</dt><dd>{registration.phone || 'Not provided'}</dd></div><div><dt>Registration date</dt><dd>{datetime(registration.created_at)}</dd></div></dl></section>
        <section className="registration-detail-card"><h2>Conference and ticket</h2><dl><div><dt>Conference</dt><dd>{registration.conference_title}</dd></div><div><dt>Company</dt><dd>{registration.company_name}</dd></div><div><dt>Ticket category</dt><dd>{registration.ticket_category_name}</dd></div><div><dt>Conference date</dt><dd>{datetime(registration.starts_at)}</dd></div></dl></section>
        <section className="registration-detail-card"><h2>Payment</h2><dl><div><dt>Amount due</dt><dd>{registration.amount_due_minor_units === 0 ? 'Free' : `${registration.currency} ${(registration.amount_due_minor_units / 100).toFixed(2)}`}</dd></div><div><dt>Method</dt><dd>{registration.payment_method === 'momo' ? 'MoMo' : registration.payment_method === 'cash' ? 'Cash' : registration.payment_method === 'paystack' ? 'Paystack' : 'Not recorded'}</dd></div><div><dt>Payment received</dt><dd>{registration.payment_received_at ? datetime(registration.payment_received_at) : 'Not received'}</dd></div><div><dt>Hold expires</dt><dd>{registration.hold_expires_at ? datetime(registration.hold_expires_at) : '—'}</dd></div></dl></section>
        <section className="registration-detail-card"><h2>Attendance</h2>{checkIn?.checked_in && checkIn.record ? <dl><div><dt>Check-in status</dt><dd><span className="registration-detail-checked">Checked in</span></dd></div><div><dt>Checked in at</dt><dd>{datetime(checkIn.record.checked_in_at)}</dd></div><div><dt>Recorded by</dt><dd>{checkIn.record.checked_in_by_name}</dd></div></dl> : <div className="registration-detail-not-checked">{checkIn ? 'Not checked in' : 'Check-in information is unavailable for your account.'}</div>}</section>
      </div>
    </>}
  </AdminLayout>;
}
