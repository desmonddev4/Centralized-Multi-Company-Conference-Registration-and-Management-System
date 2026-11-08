import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import PageHero from '../../components/layout/PageHero';
import usePlatformSettings from '../../hooks/usePlatformSettings';
import './HubInfoPages.css';

const benefits = [
  ['Discover group events', 'Find conferences hosted by the companies in our business group.'],
  ['Get the details', 'Review each event’s dates, venue, programme, speakers and ticket options.'],
  ['Take part', 'Register for a conference and keep its attendee information in one place.'],
];

export function AboutHubPage() {
  return <PublicLayout><main className="hub-info-page">
    <PageHero
      eyebrow="About the hub"
      title={<>One conference home <em>for our business group.</em></>}
      actions={<>
        <Link className="pp-btn pp-btn--primary" to="/events">Explore our conferences <span aria-hidden="true">→</span></Link>
        <Link className="pp-btn pp-btn--ghost" to="/company-hosting">For our companies</Link>
      </>}
    >
      A dedicated conference hub for one business group and the companies it owns. Each company presents its events under its own brand, with conference operations managed through a shared system.
    </PageHero>
    <section className="pp-wrap hub-info-intro">
      <div>
        <p className="pp-eyebrow">Built around one business group</p>
        <h2 className="pp-heading">One owner. Many companies. <em>One system.</em></h2>
        <p className="pp-sub">The hub gives the central owner a view across the portfolio, while company teams manage their own conference details and operations. It is purpose-built for the conferences hosted across this group.</p>
      </div>
      <div className="hub-info-steps">{benefits.map(([title, text], index) => <article className="hub-card" key={title}><span className="hub-card__num">0{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
    </section>
    <section className="hub-band">
      <div className="pp-wrap">
        <p className="hub-band__eyebrow">One client group, connected operations.</p>
        <h2>Many company brands. <em>A shared conference system.</em></h2>
        <Link className="pp-btn pp-btn--white" to="/company-hosting">See how our companies use the hub <span aria-hidden="true">→</span></Link>
      </div>
    </section>
  </main></PublicLayout>;
}

export function CompanyHostingPage() {
  return <PublicLayout><main className="hub-info-page">
    <PageHero
      eyebrow="For our companies"
      title={<>Every company’s events, <em>one operating hub.</em></>}
      actions={<Link className="pp-btn pp-btn--primary" to="/events">Browse conferences <span aria-hidden="true">→</span></Link>}
    >
      Teams across our business group can host conferences under their companies’ brands, with event setup and operations connected to one central system.
    </PageHero>
    <section className="pp-wrap hub-organizer-grid">{[
      ['01', 'Create under your company', 'Set up dates, venue, public details and the company identity for each conference.'],
      ['02', 'Build the conference', 'Manage programme sessions, speakers, registration categories and ticket options.'],
      ['03', 'Run the whole event', 'Handle registrations, payments, attendee records, reporting and on-site check-in in the shared operations hub.'],
    ].map(([number, title, text]) => <article className="hub-card hub-card--tall" key={number}><span className="hub-card__num">{number}</span><h3>{title}</h3><p>{text}</p></article>)}</section>
    <section className="pp-wrap hub-cta">
      <div>
        <p className="pp-eyebrow">Company conference teams</p>
        <h2 className="pp-heading">Ready to manage <em>an event?</em></h2>
        <p className="pp-sub">Authorized staff can sign in to access their company’s conference workspace.</p>
      </div>
      <Link className="pp-btn pp-btn--primary" to="/login">Staff sign in <span aria-hidden="true">→</span></Link>
    </section>
  </main></PublicLayout>;
}

export function ContactHubPage() {
  const settings = usePlatformSettings();
  return <PublicLayout><main className="hub-info-page">
    <PageHero eyebrow="Contact" title={<>We’re here to help <em>your next step.</em></>}>
      Questions about a group conference, attendee registration or using the hub? Contact the support team and we’ll point you in the right direction.
    </PageHero>
    <section className="pp-wrap hub-contact-grid">
      <article className="hub-card hub-card--contact">
        <span className="hub-contact-icon" aria-hidden="true">@</span>
        <p className="pp-eyebrow">Email support</p>
        {settings.support_email ? <a href={`mailto:${settings.support_email}`}>{settings.support_email}</a> : <strong>Support email coming soon</strong>}
        <p>For attendee questions, event information and help using the platform.</p>
      </article>
      <article className="hub-card hub-card--contact">
        <span className="hub-contact-icon" aria-hidden="true">☎</span>
        <p className="pp-eyebrow">Phone support</p>
        {settings.support_phone ? <a href={`tel:${settings.support_phone}`}>{settings.support_phone}</a> : <strong>Phone support coming soon</strong>}
        <p>Call the team using the support number configured for the hub.</p>
      </article>
    </section>
    <div className="pp-wrap hub-contact-footer"><p>Looking for a specific conference?</p><Link to="/events">Browse upcoming events <span aria-hidden="true">→</span></Link></div>
  </main></PublicLayout>;
}
