import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import PublicLayout from '../../components/layout/PublicLayout';
import { eventsApi, type Conference, type KioskAttendanceInput, type KioskAttendanceResult } from '../../api/events';
import './AttendeeKioskPage.css';

const roles: { value: KioskAttendanceInput['role']; label: string }[] = [
  { value: 'attendee', label: 'Attendee' },
  { value: 'speaker', label: 'Speaker' },
  { value: 'sponsor', label: 'Sponsor' },
  { value: 'exhibitor', label: 'Exhibitor' },
  { value: 'organizer', label: 'Organizer' },
  { value: 'media', label: 'Media' },
  { value: 'other', label: 'Other' },
];

function escapeVCard(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function contactCard(result: KioskAttendanceResult) {
  const { attendee } = result;
  const role = roles.find((item) => item.value === attendee.role)?.label ?? attendee.role;
  const nameParts = attendee.full_name.trim().split(/\s+/);
  const familyName = nameParts.pop() ?? '';
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escapeVCard(attendee.full_name)}`,
    `N:${escapeVCard(familyName)};${escapeVCard(nameParts.join(' '))};;;`,
    `ORG:${escapeVCard(attendee.organization)}`,
    `TITLE:${escapeVCard(attendee.job_title)}`,
    `TEL;TYPE=CELL:${escapeVCard(attendee.phone)}`,
    `NOTE:${escapeVCard(`Role: ${role}`)}`,
    'END:VCARD',
  ].join('\r\n');
}

export default function AttendeeKioskPage() {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [conference, setConference] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [organization, setOrganization] = useState('');
  const [role, setRole] = useState<KioskAttendanceInput['role']>('attendee');
  const [result, setResult] = useState<KioskAttendanceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    eventsApi.list('published')
      .then((items) => {
        const now = Date.now();
        const active = items.filter((item) => new Date(item.starts_at).getTime() <= now && new Date(item.ends_at).getTime() > now);
        setConferences(active);
        if (active.length) setConference(String(active[0].id));
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load the conferences.'))
      .finally(() => setLoading(false));
  }, []);

  const selectedConference = useMemo(
    () => conferences.find((item) => String(item.id) === conference),
    [conferences, conference],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedConference) return;
    setSaving(true);
    setError('');
    try {
      const attendance = await eventsApi.kioskAttendance({
        conference: selectedConference.slug,
        full_name: fullName,
        phone,
        job_title: jobTitle,
        organization,
        role,
      });
      setResult(attendance);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Check-in could not be completed. Please see the registration desk.');
    } finally {
      setSaving(false);
    }
  }

  function startOver() {
    setResult(null);
    setFullName('');
    setPhone('');
    setJobTitle('');
    setOrganization('');
    setRole('attendee');
    setError('');
  }

  const vcard = result ? contactCard(result) : '';
  const roleLabel = result ? roles.find((item) => item.value === result.attendee.role)?.label ?? result.attendee.role : '';

  return <PublicLayout showFooter={false}>
    <main className="attendee-kiosk pp-flow">
      <div className="attendee-kiosk__wrap">
        <header className="attendee-kiosk__header">
          <p className="pp-tag"><i aria-hidden="true" />EVENT DAY CHECK-IN</p>
          <h1 className="pp-title">Welcome.<br /><em>Let’s get you in.</em></h1>
          <p className="pp-lead">Enter your details to verify your registration and check in.</p>
        </header>

        {error && <div className="attendee-kiosk__alert" role="alert">{error}</div>}

        {result ? <section className="attendee-kiosk__success" aria-live="polite">
          <div className="attendee-kiosk__success-mark" aria-hidden="true">✓</div>
          <p className="pp-tag"><i aria-hidden="true" />{result.already_checked_in ? 'ALREADY CHECKED IN' : 'CHECK-IN COMPLETE'}</p>
          <h2>{result.already_checked_in ? 'You’re all set.' : 'You’re checked in.'}</h2>
          <p className="attendee-kiosk__success-copy">{result.detail} Scan this QR code with your phone to save the attendee contact.</p>
          <div className="attendee-kiosk__contact">
            <div className="attendee-kiosk__contact-info">
              <span>ATTENDEE CONTACT</span>
              <strong>{result.attendee.full_name}</strong>
              <p>{roleLabel} · {result.attendee.organization}</p>
              <small>{result.attendee.job_title}</small>
            </div>
            <div className="attendee-kiosk__qr" aria-label="QR code for saving this attendee as a contact">
              <QRCodeSVG value={vcard} size={208} level="M" includeMargin />
            </div>
            <a className="attendee-kiosk__download" href={`data:text/vcard;charset=utf-8,${encodeURIComponent(vcard)}`} download="attendee-contact.vcf">Download contact card</a>
          </div>
          <button className="pp-btn pp-btn--primary attendee-kiosk__restart" type="button" onClick={startOver}>Check in another attendee</button>
        </section> : <section className="attendee-kiosk__card">
          {loading ? <p className="attendee-kiosk__loading">Loading today’s conferences…</p> : conferences.length === 0
            ? <div className="attendee-kiosk__empty"><h2>Check-in isn’t open right now.</h2><p>Please ask the event registration desk for help.</p></div>
            : <form onSubmit={(event) => void submit(event)}>
              <label className="attendee-kiosk__field">Conference
                <select required value={conference} onChange={(event) => setConference(event.target.value)}>
                  <option value="">Select a conference</option>
                  {conferences.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                </select>
              </label>
              <label className="attendee-kiosk__field">Full name
                <input required minLength={3} maxLength={160} autoComplete="name" autoFocus value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="First and last name" />
              </label>
              <label className="attendee-kiosk__field">Phone number
                <input required type="tel" maxLength={40} autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+233 20 000 0000" />
              </label>
              <label className="attendee-kiosk__field">Job title
                <input required maxLength={160} autoComplete="organization-title" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder="e.g. Product Manager" />
              </label>
              <label className="attendee-kiosk__field">Organization
                <input required maxLength={160} autoComplete="organization" value={organization} onChange={(event) => setOrganization(event.target.value)} placeholder="Company or organization" />
              </label>
              <label className="attendee-kiosk__field">Your role
                <select required value={role} onChange={(event) => setRole(event.target.value as KioskAttendanceInput['role'])}>
                  {roles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <p className="attendee-kiosk__note">We’ll verify your registration and payment using your name and phone number. If you paid cash at the venue, please make sure the registration desk has recorded it.</p>
              <button className="pp-btn pp-btn--primary attendee-kiosk__submit" type="submit" disabled={saving || !selectedConference}>
                {saving ? 'Verifying your registration…' : 'Check in'}
                {!saving && <span aria-hidden="true">→</span>}
              </button>
            </form>}
        </section>}
        <p className="attendee-kiosk__help">Having trouble? Please visit the registration desk.</p>
      </div>
    </main>
  </PublicLayout>;
}
