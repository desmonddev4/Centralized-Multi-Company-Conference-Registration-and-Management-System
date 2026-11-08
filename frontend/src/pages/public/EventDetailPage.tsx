import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import PageHero from '../../components/layout/PageHero';
import LoadingState from '../../components/feedback/LoadingState';
import EventTicketCard from '../../components/events/EventTicketCard';
import TicketDialog from '../../components/events/TicketDialog';
import { activeTickets, bannerFor, clockTime, eventRange, eventWhen, useConference, useCountdown } from '../../components/events/eventHelpers';
import './EventDetailPage.css';

export function EventStateMessage({ loading, error }: { loading: boolean; error: string }) {
  return <PublicLayout><main className="pp-flow">
    <section className="ev-state pp-card">
      {loading
        ? <LoadingState label="Loading conference" />
        : <>
          <p className="pp-eyebrow">Conference</p>
          <h1>We couldn’t find that event.</h1>
          <p>{error || 'It may have been unpublished or the link is incorrect.'}</p>
          <Link className="pp-btn pp-btn--primary" to="/events">Browse conferences</Link>
        </>}
    </section>
  </main></PublicLayout>;
}

export default function EventDetailPage() {
  const { eventId = '' } = useParams();
  const { event, loading, error } = useConference(eventId);
  const clock = useCountdown(event?.starts_at);
  const [picking, setPicking] = useState(false);
  const closeDialog = useCallback(() => setPicking(false), []);

  if (loading || !event) return <EventStateMessage loading={loading} error={error} />;

  const { date, time } = eventWhen(event);
  const banner = bannerFor(event);
  const canRegister = activeTickets(event).length > 0;
  const summary = event.description.split('\n\n')[0] || 'Join a community of people coming together to share ideas and build what comes next.';

  return <PublicLayout>
    <PageHero
      eyebrow={event.company_name}
      title={event.title}
      actions={<>
        {canRegister && <button type="button" className="pp-btn pp-btn--primary" onClick={() => setPicking(true)}>Select ticket type <span aria-hidden="true">→</span></button>}
        <Link className="pp-btn pp-btn--ghost" to={'/events/' + event.slug + '/about'}>About this conference</Link>
      </>}
      meta={<>
        <span className="pp-chip">{eventRange(event)}</span>
        <span className="pp-chip">{event.venue_name || 'Venue to be confirmed'}</span>
        {clock && <div className="ev-clock" role="timer" aria-label="Time until the conference starts">
          <span className="ev-clock__label">Starts in</span>
          {clock.map(([label, value]) => <div key={label}><strong>{label === 'Days' ? value : String(value).padStart(2, '0')}</strong><span>{label}</span></div>)}
        </div>}
      </>}
    >
      {summary}
    </PageHero>

    <main className="ev-body pp-wrap">
      {banner && <figure className="ev-banner"><img src={banner} alt={event.title} /></figure>}
      <div className="ev-layout">
        <div className="ev-main">
          <div className="ev-facts">
            <article className="ev-fact"><span className="ev-fact__icon" aria-hidden="true">◷</span><div><strong>{date}</strong><p>{time}</p></div></article>
            <article className="ev-fact"><span className="ev-fact__icon" aria-hidden="true">⌖</span><div><strong>{event.venue_name || 'Venue to be confirmed'}</strong><p>{event.venue_address || 'Location details will be shared soon.'}</p></div></article>
          </div>
          <Link className="ev-link" to={'/events/' + event.slug + '/about'}>About this conference <span aria-hidden="true">→</span></Link>
          {event.agenda_sessions?.length > 0 && <section className="ev-program">
            <p className="pp-eyebrow">Conference programme</p>
            <h2 className="pp-heading">Sessions and <em>speakers</em></h2>
            <div className="ev-program__list">{event.agenda_sessions.map((session) => <article key={session.id} className="ev-session">
              <div className="ev-session__time"><strong>{clockTime(session.starts_at)}</strong><span>{clockTime(session.ends_at)}</span></div>
              <div className="ev-session__body">
                <h3>{session.title}</h3>
                {session.speaker_name && <p className="ev-session__speaker">{session.speaker_name}</p>}
                {session.description && <p>{session.description}</p>}
              </div>
              {session.venue_name && <span className="ev-session__venue">{session.venue_name}</span>}
            </article>)}</div>
          </section>}
        </div>
        <EventTicketCard event={event} onSelect={() => setPicking(true)} />
      </div>
    </main>
    <TicketDialog event={event} open={picking} onClose={closeDialog} />
  </PublicLayout>;
}
