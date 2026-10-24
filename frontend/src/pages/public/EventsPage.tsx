import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
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
  const prices = active.map((ticket) => ticket.price_minor_units);
  const lowest = Math.min(...prices);
  return lowest === 0 ? 'Free registration' : 'From GHS ' + (lowest / 100).toFixed(2);
}
export default function EventsPage() {
  const [events, setEvents] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => { eventsApi.list().then(setEvents).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load conferences.')).finally(() => setLoading(false)); }, []);
  const filtered = events.filter((event) => (event.title + event.company_name + event.venue_name).toLowerCase().includes(query.toLowerCase()));
  return <PublicLayout><main className="events-discovery"><div className="events-intro"><p className="eyebrow">MAKE ROOM FOR A NEW IDEA</p><h1>Find your next<br/><em>good conversation.</em></h1><p>Explore upcoming conferences from across our group and find the room where your next idea begins.</p></div><div className="discovery-tools"><div><span>⌕</span><input placeholder="Search conferences or locations" aria-label="Search conferences or locations" value={query} onChange={(event) => setQuery(event.target.value)}/></div><span>{filtered.length} {filtered.length===1?'event':'events'}</span></div>{error&&<div className="discovery-error" role="alert">{error}</div>}{loading?<div className="discovery-loading">Finding upcoming events…</div>:filtered.length===0?<EmptyState title={query?'No matching events':'No published events yet'} message={query?'Try a different search.':'Check back soon for new conferences and registration details.'}/>:<div className="event-card-grid">{filtered.map((event) => <article className="discovery-card" key={event.id}><Link to={'/events/'+event.slug} className="discovery-card__image" style={event.banner_url?{backgroundImage:'linear-gradient(180deg,rgba(20,38,31,.02),rgba(20,38,31,.2)),url('+event.banner_url+')'}:undefined}><span className="discovery-card__company">{event.company_name}</span><span className="discovery-card__image-mark">✳</span></Link><div className="discovery-card__body"><p className="discovery-card__date">{eventDate(event.starts_at,event.ends_at)}</p><h2><Link to={'/events/'+event.slug}>{event.title}</Link></h2><p className="discovery-card__venue">⌖ {event.venue_name||'Venue to be confirmed'}{event.venue_address?', '+event.venue_address:''}</p><div className="discovery-card__foot"><span>{priceLabel(event)}</span><Link to={'/events/'+event.slug}>View event <b>→</b></Link></div></div></article>)}</div>}</main></PublicLayout>;
}


