import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import PageHero from '../../components/layout/PageHero';
import EventTicketCard from '../../components/events/EventTicketCard';
import TicketDialog from '../../components/events/TicketDialog';
import { activeTickets, bannerFor, eventWhen, useConference } from '../../components/events/eventHelpers';
import { EventStateMessage } from './EventDetailPage';
import './EventDetailPage.css';

export default function EventAboutPage() {
  const { eventId = '' } = useParams();
  const { event, loading, error } = useConference(eventId);
  const [picking, setPicking] = useState(false);
  const closeDialog = useCallback(() => setPicking(false), []);

  if (loading || !event) return <EventStateMessage loading={loading} error={error} />;

  const { date, time } = eventWhen(event);
  const banner = bannerFor(event);
  const paragraphs = event.description.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);

  return <PublicLayout>
    <PageHero
      compact
      eyebrow={'About · ' + event.company_name}
      title={event.title}
      actions={<>
        {activeTickets(event).length > 0 && <button type="button" className="pp-btn pp-btn--primary" onClick={() => setPicking(true)}>Select ticket type <span aria-hidden="true">→</span></button>}
        <Link className="pp-btn pp-btn--ghost" to={'/events/' + event.slug}>← Back to conference</Link>
      </>}
    />
    <main className="ev-body pp-wrap">
      {banner && <figure className="ev-banner"><img src={banner} alt={event.title} /></figure>}
      <div className="ev-layout">
        <div className="ev-main">
          <section className="ev-about">
            <p className="pp-eyebrow">About this conference</p>
            <h2 className="pp-heading">What to <em>expect</em></h2>
            <div className="ev-prose">
              {paragraphs.length ? paragraphs.map((text, index) => <p key={index}>{text}</p>) : <p>Join a community of people coming together to share ideas and build what comes next. Full details will be shared soon.</p>}
            </div>
          </section>
          <div className="ev-facts">
            <article className="ev-fact"><span className="ev-fact__icon" aria-hidden="true">◷</span><div><strong>{date}</strong><p>{time}</p></div></article>
            <article className="ev-fact"><span className="ev-fact__icon" aria-hidden="true">⌖</span><div><strong>{event.venue_name || 'Venue to be confirmed'}</strong><p>{event.venue_address || 'Location details will be shared soon.'}</p></div></article>
          </div>
          {event.agenda_sessions?.length > 0 && <Link className="ev-link" to={'/events/' + event.slug}>See the full programme <span aria-hidden="true">→</span></Link>}
        </div>
        <EventTicketCard event={event} onSelect={() => setPicking(true)} />
      </div>
    </main>
    <TicketDialog event={event} open={picking} onClose={closeDialog} />
  </PublicLayout>;
}
