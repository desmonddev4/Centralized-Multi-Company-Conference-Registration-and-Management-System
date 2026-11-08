import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import PageHero from '../../components/layout/PageHero';
import EmptyState from '../../components/feedback/EmptyState';
import { eventsApi, type Conference } from '../../api/events';
import './EventsPage.css';

function eventDate(start: string, end: string) {
  const first = new Date(start);
  const last = new Date(end);
  const formatter = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  return formatter.format(first) + (first.toDateString() === last.toDateString() ? '' : ' – ' + formatter.format(last));
}
function priceLabel(event: Conference) {
  const active = event.ticket_categories.filter((ticket) => ticket.is_active);
  if (!active.length) return 'Registration details soon';
  const prices = active.map((ticket) => ticket.current_price_minor_units);
  const lowest = Math.min(...prices);
  const currency = active.find((ticket) => ticket.current_price_minor_units === lowest)?.currency || 'GHS';
  return lowest === 0 ? 'Free registration' : 'From ' + currency + ' ' + (lowest / 100).toFixed(2);
}
export default function EventsPage() {
  const [events, setEvents] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => { eventsApi.list().then(setEvents).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load conferences.')).finally(() => setLoading(false)); }, []);
  const filtered = events.filter((event) => (event.title + event.company_name + event.venue_name).toLowerCase().includes(query.toLowerCase()));
  return <PublicLayout>
    <PageHero eyebrow="Conferences from our group" title={<>Find your next <em>good conversation.</em></>}>
      Browse conferences hosted by the companies within our business group. Each event has its own details, programme and registration options.
    </PageHero>
    <main className="events-discovery pp-wrap">
      <div className="discovery-tools">
        <label className="discovery-search">
          <span aria-hidden="true">⌕</span>
          <input placeholder="Search conferences or locations" aria-label="Search conferences or locations" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <span className="discovery-count">{filtered.length} {filtered.length === 1 ? 'event' : 'events'}</span>
      </div>
      {error && <div className="discovery-error" role="alert">{error}</div>}
      {loading
        ? <div className="discovery-loading">Finding upcoming events…</div>
        : filtered.length === 0
          ? <EmptyState title={query ? 'No matching events' : 'No published events yet'} message={query ? 'Try a different search.' : 'Check back soon for new conferences and registration details.'} />
          : <div className="event-card-grid">{filtered.map((event) => {
            const banner = event.banner_url || (event.slug === 'aipis-2027' ? '/assets/AIPIS%202027_%20From%20Close%20to%20Prosperity.png' : '');
            return <article className="discovery-card" key={event.id}>
              <Link to={'/events/' + event.slug} className={'discovery-card__image' + (banner ? ' discovery-card__image--banner' : '')} aria-label={event.title}>
                {banner
                  ? <img src={banner} alt={event.title} loading="lazy" />
                  : <><span className="discovery-card__company">{event.company_name}</span><span className="discovery-card__image-mark">✳</span></>}
              </Link>
              <div className="discovery-card__body">
                <p className="discovery-card__date">{eventDate(event.starts_at, event.ends_at)}</p>
                <h2><Link to={'/events/' + event.slug}>{event.title}</Link></h2>
                <p className="discovery-card__venue">⌖ {event.venue_name || 'Venue to be confirmed'}{event.venue_address ? ', ' + event.venue_address : ''}</p>
                <div className="discovery-card__foot">
                  <span>{priceLabel(event)}</span>
                  <Link to={'/events/' + event.slug}>View event <b aria-hidden="true">→</b></Link>
                </div>
              </div>
            </article>;
          })}</div>}
    </main>
  </PublicLayout>;
}
