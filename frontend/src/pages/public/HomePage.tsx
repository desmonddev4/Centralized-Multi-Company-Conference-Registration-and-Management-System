import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import { eventsApi, type AgendaSession, type Conference } from '../../api/events';
import HomeHero, { AIPIS_STARTS_AT } from './HomeHero';
import './HomePage.css';

/* Vite serves files from frontend/public at the site root. */
const PROMO_VIDEO = '/assets/aipis-promo%20(1).mp4';
const PROMO_POSTER = '/assets/aipis-promo-poster.jpg';
const ABOUT_MAIN = '/assets/about-1.jpeg';
const ABOUT_SECOND = '/assets/about-2.jpeg';

const conferencePhotos = [
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1800&q=85',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=900&q=80',
];

const galleryPhotos = [ABOUT_MAIN, ABOUT_SECOND, conferencePhotos[2], conferencePhotos[3], conferencePhotos[4]];

/* Stagger helper: <el style={delay(2)} /> -> --d: 160ms */
const delay = (index: number, step = 80): CSSProperties => ({ ['--d' as string]: `${index * step}ms` });

const initials = (name: string) => name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();

function formatDate(value: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return new Intl.DateTimeFormat(undefined, options).format(new Date(value));
}

function priceLabel(event: Conference) {
  const available = event.ticket_categories.filter((ticket) => ticket.is_active);
  if (!available.length) return 'Registration details coming soon';
  const amount = Math.min(...available.map((ticket) => ticket.current_price_minor_units));
  if (amount === 0) return 'Free registration';
  const currency = available.find((ticket) => ticket.current_price_minor_units === amount)?.currency || 'GHS';
  return `From ${currency} ${(amount / 100).toFixed(2)}`;
}

function Countdown({ date }: { date?: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const remaining = date ? Math.max(0, new Date(date).getTime() - now) : 0;
  const values = [
    Math.floor(remaining / 86_400_000),
    Math.floor((remaining / 3_600_000) % 24),
    Math.floor((remaining / 60_000) % 60),
    Math.floor((remaining / 1_000) % 60),
  ];
  return <div className="home-countdown__clock" aria-label={date ? `Conference starts in ${values[0]} days` : 'Explore upcoming conferences'}>
    {values.map((value, index) => <div className="home-countdown__unit" key={index}><strong>{String(value).padStart(index ? 2 : 1, '0')}</strong><span>{['Days', 'Hours', 'Minutes', 'Seconds'][index]}</span></div>)}
  </div>;
}

function Schedule({ sessions, event }: { sessions: AgendaSession[]; event?: Conference }) {
  const days = useMemo(() => [...new Set(sessions.map((session) => new Date(session.starts_at).toDateString()))], [sessions]);
  const [selectedDay, setSelectedDay] = useState('');
  useEffect(() => { setSelectedDay(days[0] || ''); }, [days.join('|')]);
  const visible = sessions.filter((session) => !selectedDay || new Date(session.starts_at).toDateString() === selectedDay);
  return <section className="home-section home-section--soft" id="schedule"><div className="home-wrap">
    <div className="home-section-title" data-reveal><div><span className="home-eyebrow">PLAN YOUR EXPERIENCE</span><h2>Information of event schedule</h2><p>Get a feel for what your day at the conference could look like.</p></div>
      {event && <Link className="home-outline-button" to={`/events/${event.slug}`}>View event <span aria-hidden="true">↗</span></Link>}
    </div>
    {days.length > 1 && <div className="home-day-tabs" role="tablist" aria-label="Schedule days" data-reveal>{days.map((day, index) => <button key={day} type="button" role="tab" aria-selected={selectedDay === day} className={selectedDay === day ? 'is-active' : ''} onClick={() => setSelectedDay(day)}>Day {index + 1}</button>)}</div>}
    {visible.length ? <div className="home-agenda">{visible.map((session, index) => <article className="home-agenda__item glass" key={session.id} style={delay(index, 70)}>
      <div className="home-agenda__photo" style={{ backgroundImage: `url("${event?.banner_url || conferencePhotos[index % conferencePhotos.length]}")` }} aria-hidden="true" />
      <div className="home-agenda__time"><strong>{formatDate(session.starts_at, { hour: 'numeric', minute: '2-digit' })}</strong><span>{formatDate(session.ends_at, { hour: 'numeric', minute: '2-digit' })}</span></div>
      <div className="home-agenda__description"><h3>{session.title}</h3><p>{session.description || 'Join this session as part of the conference programme.'}</p><span>{session.venue_name || event?.venue_name || 'Conference venue'}</span></div>
      <div className="home-agenda__speaker"><span className="home-avatar" aria-hidden="true">{session.speaker_name ? initials(session.speaker_name) : 'EV'}</span><span>{session.speaker_name || 'Conference team'}</span></div>
    </article>)}</div> : <div className="home-schedule__empty glass" data-reveal><span className="home-eyebrow">THE PROGRAMME</span><h3>{event ? 'The schedule is taking shape.' : 'A full programme is on the way.'}</h3><p>{event ? 'Check back soon for session times, speakers and venue details.' : 'Explore upcoming conferences to see their session plans and event details.'}</p>{event && <Link to={`/events/${event.slug}`}>See conference details <span aria-hidden="true">↗</span></Link>}</div>}
  </div></section>;
}

export default function HomePage() {
  const [events, setEvents] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [promoOpen, setPromoOpen] = useState(false);

  const pageRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    eventsApi.list().then((items) => { if (active) setEvents(items); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Upcoming conferences could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const upcoming = events.filter((event) => event.status === 'published' && new Date(event.starts_at).getTime() >= Date.now())
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  const featured = upcoming[0];
  const sessions = featured?.agenda_sessions || [];
  const speakers = [...new Set(sessions.map((session) => session.speaker_name).filter(Boolean))];
  const tickets = featured?.ticket_categories.filter((ticket) => ticket.is_active) || [];
  const isAipis = featured?.slug === 'aipis-2027';

  /* Scroll progress bar + hero parallax (one rAF-throttled listener) */
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      const hero = heroRef.current;
      if (hero) hero.style.setProperty('--hero-p', Math.min(1, y / Math.max(1, hero.offsetHeight)).toFixed(3));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  /* Reveal-on-scroll for every [data-reveal]; re-runs when async sections mount */
  useEffect(() => {
    const nodes = Array.from(pageRef.current?.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-visible)') ?? []);
    if (!nodes.length) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) { nodes.forEach((node) => node.classList.add('is-visible')); return; }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [loading, events.length, sessions.length, speakers.length, tickets.length]);

  /* Promo modal: close on Escape and lock page scroll while open */
  useEffect(() => {
    if (!promoOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPromoOpen(false); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [promoOpen]);

  /* Cursor spotlight on glass cards */
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const card = (event.target as HTMLElement).closest<HTMLElement>('.glass');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    card.style.setProperty('--my', `${event.clientY - rect.top}px`);
  };

  const conferenceDetailsTo = featured ? `/events/${featured.slug}` : '/events';
  const registerTo = featured ? `${conferenceDetailsTo}/register` : '/events';

  return <PublicLayout><div className="home-progress" aria-hidden="true"><div ref={progressRef} /></div><main className="home-page" ref={pageRef} onPointerMove={onPointerMove}>
    <HomeHero sectionRef={heroRef} featured={featured} isAipis={isAipis} registerTo={registerTo} onOpenPromo={() => setPromoOpen(true)} />

    <section className="home-about home-wrap" id="about">
      <div className="home-about__visual" data-reveal="left">
        <div className="home-about__blob" aria-hidden="true" />
        <div className="home-about__photo home-about__photo--main" style={{ backgroundImage: `url("${ABOUT_MAIN}")` }} role="img" aria-label="Opening ceremony on the main stage" />
        <div className="home-about__photo home-about__photo--small" style={{ backgroundImage: `url("${ABOUT_SECOND}")` }} role="img" aria-label="Traditional drummers and dancer performing on stage" />
        <span className="home-about__frame" aria-hidden="true" />
        <Link className="home-about__play" to={conferenceDetailsTo} aria-label="Explore conference details"><span aria-hidden="true">↗</span></Link>
      </div>
      <div className="home-about__copy" data-reveal="right"><span className="home-eyebrow">{isAipis ? 'ABOUT AIPIS' : 'ABOUT THE CONFERENCE'}</span><h2>{isAipis ? <>Infrastructure that<br />delivers <em>prosperity.</em></> : <>Know more about<br />the <em>conference.</em></>}</h2><p>{isAipis ? 'AIPIS measures African infrastructure by what it delivers: industrial output, jobs and better living standards.' : featured?.description ? `${featured.description.slice(0, 190).trim()}${featured.description.length > 190 ? '…' : ''}` : 'A chance to share ideas, find fresh perspectives and build relationships that keep growing long after the conference.'}</p>
        {isAipis&&<div className="home-about__outcomes" aria-label="AIPIS outcomes"><span>Industrial output</span><span>Jobs</span><span>Better living standards</span></div>}
        <div className="home-about__bottom"><Link className="home-button home-button--blue" to={conferenceDetailsTo}>View conference details <span aria-hidden="true">↗</span></Link></div>
      </div>
    </section>

    <section className="home-countdown"><div className="home-countdown__inner" data-reveal><div><span className="home-eyebrow">SAVE YOUR PLACE</span><h2>{featured ? 'Count every second until the event.' : 'Your next great event is closer than you think.'}</h2><Link to={registerTo}>{featured ? 'Get your ticket' : 'Browse events'} <span aria-hidden="true">↗</span></Link></div><Countdown date={featured?.starts_at ?? AIPIS_STARTS_AT} /></div></section>

    <section className="home-section home-section--soft home-features"><div className="home-wrap"><div className="home-section-title home-section-title--center" data-reveal><div><span className="home-eyebrow">EVENT FEATURES</span><h2>Unifying for a better world</h2><p>Everything you need for an experience worth remembering.</p></div></div><div className="home-feature-grid">
      {[['✣', 'Speaker lineup', 'Hear from practitioners and leaders sharing real experience.'], ['♧', 'Networking people', 'Meet peers, exchange perspectives and grow your connections.'], ['◈', 'Engaging keynote', 'Make space for fresh ideas and conversations that matter.'], ['▤', 'Exhibition space', 'Explore products, services and teams shaping what comes next.']].map(([icon, title, description], index) => <article className="home-feature glass" key={title} data-reveal style={delay(index)}><span className="home-feature__icon">{icon}</span><h3>{title}</h3><p>{description}</p></article>)}
    </div></div></section>

    <section className="home-section" id="upcoming-events"><div className="home-wrap"><div className="home-section-title" data-reveal><div><span className="home-eyebrow">DON'T MISS WHAT'S NEXT</span><h2>Upcoming conferences</h2><p>Find the next room where people and ideas come together.</p></div><Link className="home-outline-button" to="/events">See all events <span aria-hidden="true">↗</span></Link></div>
      {loading ? <div className="home-upcoming__empty" data-reveal>Loading upcoming conferences…</div> : upcoming.length ? <div className="home-upcoming__grid">{upcoming.slice(0, 3).map((event, index) => <article className="home-upcoming-card glass" key={event.id} data-reveal style={delay(index)}><Link to={`/events/${event.slug}`} className="home-upcoming-card__image" aria-label={`View ${event.title}`}><span style={{ backgroundImage: `url("${event.banner_url || conferencePhotos[index + 1]}")` }} /></Link><div className="home-upcoming-card__body"><span>{formatDate(event.starts_at)}</span><h3><Link to={`/events/${event.slug}`}>{event.title}</Link></h3><p>{event.venue_name || 'Venue to be announced'} · {event.company_name}</p><div><strong>{priceLabel(event)}</strong><Link to={`/events/${event.slug}`}>Details <span aria-hidden="true">↗</span></Link></div></div></article>)}</div> : <div className="home-upcoming__empty" data-reveal>{error || 'New events are being planned. Browse the events page for published conferences.'} <Link to="/events">Browse all events ↗</Link></div>}
    </div></section>

    {sessions.length > 0 && <Schedule sessions={sessions} event={featured} />}

    {speakers.length > 0 && <section className="home-speaker-banner" id="speakers" style={{ backgroundImage: `linear-gradient(90deg,rgba(14,73,213,.94),rgba(18,91,238,.86)),url("${ABOUT_SECOND}")` }}><div className="home-speaker-banner__inner" data-reveal><span className="home-speaker-banner__spark" aria-hidden="true">✳</span><span className="home-eyebrow">{featured ? featured.company_name : 'THE PEOPLE BEHIND THE IDEAS'}</span><h2>{speakers.length ? 'Meet the voices shaping this event.' : 'Never miss another speaker announcement.'}</h2><p>{speakers.length ? `${speakers.length} ${speakers.length === 1 ? 'speaker is' : 'speakers are'} currently listed in the programme.` : 'Discover upcoming events and be the first to see new programme announcements.'}</p>{featured && speakers.length > 0 && <div className="home-speaker-banner__names">{speakers.slice(0, 4).map((name) => <span key={name}>{name}</span>)}</div>}<Link className="home-button home-button--white" to={conferenceDetailsTo}>{featured ? 'View conference' : 'Explore conferences'} <span aria-hidden="true">↗</span></Link><span className="home-speaker-banner__bubble" aria-hidden="true" /></div></section>}

    {speakers.length > 0 && <section className="home-section"><div className="home-wrap"><div className="home-section-title" data-reveal><div><span className="home-eyebrow">THE PEOPLE ON STAGE</span><h2>Meet our speakers</h2></div><Link className="home-outline-button" to={conferenceDetailsTo}>View programme <span aria-hidden="true">↗</span></Link></div><div className="home-speaker-grid">{speakers.slice(0, 3).map((name, index) => <article className="home-speaker-card glass" key={name} data-reveal style={delay(index)}><div className="home-speaker-card__photo"><span style={{ backgroundImage: `url("${conferencePhotos[(index + 1) % conferencePhotos.length]}")` }} /><b className="home-avatar">{initials(name)}</b></div><h3>{name}</h3><p>Conference speaker</p></article>)}</div></div></section>}

    {!!tickets.length && <section className="home-section home-section--soft home-tickets"><div className="home-wrap"><div className="home-section-title home-section-title--center" data-reveal><div><span className="home-eyebrow">CHOOSE YOUR TICKET</span><h2>Find the right way in.</h2><p>{featured?.title}</p></div></div><div className="home-ticket-grid">{tickets.map((ticket, index) => <article className={`home-ticket glass ${index === 1 ? 'home-ticket--featured' : ''}`} key={ticket.id} data-reveal style={delay(index)}><span className="home-ticket__label">{ticket.name}</span><strong>{ticket.current_price_minor_units === 0 ? 'Free' : `${ticket.currency} ${(ticket.current_price_minor_units / 100).toFixed(2)}`}</strong>{ticket.early_price_minor_units!==null&&ticket.early_sales_close_at&&<small className="home-ticket__price-note">Standard {ticket.currency} {(ticket.price_minor_units/100).toFixed(2)} · early fee through {new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short'}).format(new Date(ticket.early_sales_close_at))}</small>}<p>{ticket.description || 'Admission to the conference and its scheduled sessions.'}</p><Link to={`/events/${featured!.slug}`}>View ticket details <span aria-hidden="true">↗</span></Link></article>)}</div></div></section>}

    <section className="home-section"><div className="home-wrap"><div className="home-section-title" data-reveal><div><span className="home-eyebrow">A LOOK INSIDE</span><h2>Moments worth sharing</h2><p>Good ideas grow when people get together.</p></div><Link className="home-outline-button" to="/events">Explore events <span aria-hidden="true">↗</span></Link></div><div className="home-gallery__grid">{galleryPhotos.map((photo, index) => <div className={`home-gallery__photo home-gallery__photo--${index + 1}`} key={photo} data-reveal="zoom" style={delay(index, 70)}><span style={{ backgroundImage: `url("${photo}")` }} /></div>)}</div></div></section>

    <section className="home-final-cta"><div data-reveal="left"><span className="home-eyebrow">YOUR NEXT CHAPTER STARTS HERE</span><h2>Get direction for the event ahead.</h2><p>Find an event, bring your ideas and leave with new connections.</p><Link className="home-button home-button--white" to="/events">Browse conferences <span aria-hidden="true">↗</span></Link></div><div className="home-final-cta__side" data-reveal="right"><span>01</span><strong>Meet.<br />Learn.<br />Move forward.</strong></div></section>

    {promoOpen && <div className="home-modal" role="dialog" aria-modal="true" aria-label="AIPIS 2027 promo video" onClick={() => setPromoOpen(false)}>
      <div className="home-modal__panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="home-modal__close" onClick={() => setPromoOpen(false)} aria-label="Close video">✕</button>
        <video src={PROMO_VIDEO} poster={PROMO_POSTER} controls autoPlay playsInline />
      </div>
    </div>}

    {error && <p className="home-load-note" role="status">{error} {loading ? 'Loading events…' : 'You can still browse the events page.'}</p>}
  </main></PublicLayout>;
}