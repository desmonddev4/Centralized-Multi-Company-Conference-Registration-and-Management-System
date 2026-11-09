import { useEffect, useState, type Ref } from 'react';
import { Link } from 'react-router-dom';
import type { Conference } from '../../api/events';
import './HomeHero.css';

/* Put hero-hall.jpg and hero-keynote.jpg in frontend/public/assets/ */
const HERO_BG = '/assets/hero-hall.jpg';
const HERO_PHOTO = '/assets/hero-keynote.jpg';
/* Official AIPIS 2027 dates (22–27 March 2027, Labadi Beach Hotel, Accra). Accra is on GMT all year. */
export const AIPIS_STARTS_AT = '2027-03-22T00:00:00Z';
const AIPIS_ENDS_AT = '2027-03-27T23:59:59Z';
const EVENT_TZ = 'Africa/Accra';

function formatDateRange(start: string, end?: string) {
  const s = new Date(start);
  const e = end ? new Date(end) : s;
  const part = (d: Date, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: EVENT_TZ, ...options }).format(d);
  const sameDay = part(s, { dateStyle: 'short' }) === part(e, { dateStyle: 'short' });
  if (sameDay) return part(s, { month: 'long', day: 'numeric', year: 'numeric' });
  if (part(s, { month: 'numeric', year: 'numeric' }) === part(e, { month: 'numeric', year: 'numeric' })) {
    return `${part(s, { month: 'long' })} ${part(s, { day: 'numeric' })}–${part(e, { day: 'numeric' })}, ${part(s, { year: 'numeric' })}`;
  }
  return `${part(s, { month: 'short', day: 'numeric' })} – ${part(e, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

type Props = {
  sectionRef: Ref<HTMLElement>;
  featured?: Conference;
  isAipis: boolean;
  registerTo: string;
  onOpenPromo: () => void;
};

function useCountdown(date?: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!date) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [date]);
  if (!date) return null;
  const ms = Math.max(0, new Date(date).getTime() - now);
  return [
    ['Days', Math.floor(ms / 86_400_000)],
    ['Hrs', Math.floor((ms / 3_600_000) % 24)],
    ['Min', Math.floor((ms / 60_000) % 60)],
    ['Sec', Math.floor((ms / 1_000) % 60)],
  ] as const;
}

export default function HomeHero({ sectionRef, featured, isAipis: isAipisEvent, registerTo, onOpenPromo }: Props) {
  /* With no featured event the hero shows the AIPIS 2027 defaults */
  const isAipis = isAipisEvent || !featured;
  const startsAt = featured?.starts_at ?? (isAipis ? AIPIS_STARTS_AT : undefined);
  const clock = useCountdown(startsAt);

  const intro = isAipis
    ? 'AIPIS measures African infrastructure by what it delivers: industrial output, jobs and better living standards.'
    : featured?.description
      ? `${featured.description.slice(0, 150).trim()}${featured.description.length > 150 ? '…' : ''}`
      : 'Bring bold ideas and good people together. Find your next conference, meet inspiring minds and make the connections that move work forward.';
  const chips = isAipis ? ['Industrial output', 'Jobs', 'Better living standards'] : ['Keynotes', 'Networking', 'Exhibition'];
  const tickerItems: { text: string; serif?: boolean }[] = isAipis
    ? [
        { text: 'Building infrastructure' },
        { text: 'Powering industry', serif: true },
        { text: 'Delivering prosperity' },
        { text: 'AIPIS 2027 · Ghana', serif: true },
      ]
    : [
        { text: featured?.title || 'Find your next conference' },
        { text: 'Meet', serif: true },
        { text: 'Learn' },
        { text: 'Move forward', serif: true },
      ];

  const endsAt = featured?.ends_at ?? (isAipis ? AIPIS_ENDS_AT : undefined);
  const dateText = startsAt ? formatDateRange(startsAt, endsAt) : '';
  const place = featured?.venue_name || (isAipis ? 'Labadi Beach Hotel · Accra, Ghana' : '');

  const registerLabel = <>Register now <span aria-hidden="true">→</span></>;

  return (
    <section className="hero" id="top" ref={sectionRef}>
      <div className="hero__bg" style={{ backgroundImage: `url("${HERO_BG}")` }} aria-hidden="true" />
      <div className="hero__shade" aria-hidden="true" />

      <div className="hero__copy">
        <h1 className="hero__title">
          {isAipis ? 'From financial close to prosperity close.' : featured?.title || 'Big conference & workshop'}
        </h1>

        {isAipis && <p className="hero__tagline"><span aria-hidden="true" />Delivering prosperity.</p>}

        <p className="hero__intro">{intro}</p>

        <div className="hero__actions">
          {featured?.registration_url
            ? <a className="hero__btn hero__btn--primary" href={featured.registration_url}>{registerLabel}</a>
            : <Link className="hero__btn hero__btn--primary" to={registerTo}>{registerLabel}</Link>}
          <a className="hero__btn hero__btn--ghost" href="#about">Explore summit</a>
        </div>

        {clock && (
          <div className="hero__event">
            <div className="hero__date">
              <strong>{dateText}</strong>
              {place && <span>{place}</span>}
            </div>
            <div className="hero__clock" role="timer" aria-label={`Starts in ${clock[0][1]} days`}>
              {clock.map(([label, value]) => (
                <div className="hero__unit" key={label}>
                  <strong>{label === 'Days' ? value : String(value).padStart(2, '0')}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="hero__visual">
        <div className="hero__frame">
          <img src={HERO_PHOTO} alt="Keynote speaker on stage in front of a city skyline and bridge" />
          {isAipis && (
            <button type="button" className="hero__promo" onClick={onOpenPromo} aria-label="Watch the AIPIS 2027 promo video">
              <span aria-hidden="true">▶</span> Watch promo
            </button>
          )}
        </div>
        {chips.map((chip, index) => <span key={chip} className={`hero__chip hero__chip--${index + 1}`}>{chip}</span>)}
      </div>

      <a className="hero__scroll" href="#about" aria-label="Scroll to about section">Scroll<i aria-hidden="true" /></a>

      <div className="hero__ticker" aria-hidden="true">
        {[0, 1].map((copy) => (
          <div className="hero__track" key={copy}>
            {[...tickerItems, ...tickerItems].map((item, index) => (
              <span className="hero__ticker-item" key={index}>
                <b>✦</b>
                <span className={item.serif ? 'is-serif' : ''}>{item.text}</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
