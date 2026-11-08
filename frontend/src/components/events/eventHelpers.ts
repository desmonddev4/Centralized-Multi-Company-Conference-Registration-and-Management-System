import { useEffect, useState } from 'react';
import { eventsApi, type Conference, type TicketCategory } from '../../api/events';

const AIPIS_BANNER = '/assets/AIPIS%202027_%20From%20Close%20to%20Prosperity.png';

export const bannerFor = (event: Conference) => event.banner_url || (event.slug === 'aipis-2027' ? AIPIS_BANNER : '');
export const activeTickets = (event: Conference): TicketCategory[] => event.ticket_categories.filter((ticket) => ticket.is_active);
export const money = (minor: number, currency: string) => (minor === 0 ? 'Free' : `${currency} ${(minor / 100).toFixed(2)}`);
export const shortDate = (iso: string) => new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
export const clockTime = (iso: string) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

/* Compact range for chips, e.g. "March 22–27, 2027" (UTC calendar days). */
export function eventRange(event: Conference) {
  const part = (iso: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options }).format(new Date(iso));
  const { starts_at: start, ends_at: end } = event;
  if (part(start, { dateStyle: 'short' }) === part(end, { dateStyle: 'short' })) return part(start, { month: 'long', day: 'numeric', year: 'numeric' });
  if (part(start, { month: 'numeric', year: 'numeric' }) === part(end, { month: 'numeric', year: 'numeric' })) {
    return `${part(start, { month: 'long' })} ${part(start, { day: 'numeric' })}–${part(end, { day: 'numeric' })}, ${part(start, { year: 'numeric' })}`;
  }
  return `${part(start, { month: 'short', day: 'numeric' })} – ${part(end, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

/* Dates are stored as UTC calendar days, so they are formatted in UTC to avoid shifting by a day. */
export function eventWhen(event: Conference) {
  const start = new Date(event.starts_at);
  const end = new Date(event.ends_at);
  const day = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const multiDay = end.toISOString().slice(0, 10) !== start.toISOString().slice(0, 10);
  const hasTime = start.getUTCHours() !== 0 || start.getUTCMinutes() !== 0;
  return {
    date: day.format(start) + (multiDay ? ' – ' + day.format(end) : ''),
    time: hasTime ? clockTime(event.starts_at) + ' · Local event time' : 'Daily programme times to be confirmed',
  };
}

export function useCountdown(startsAt?: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startsAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [startsAt]);
  if (!startsAt) return null;
  const left = Math.max(0, Math.floor((new Date(startsAt).getTime() - now) / 1000));
  if (left === 0) return null;
  return [
    ['Days', Math.floor(left / 86400)],
    ['Hrs', Math.floor((left % 86400) / 3600)],
    ['Min', Math.floor((left % 3600) / 60)],
    ['Sec', left % 60],
  ] as const;
}

export function useConference(slug: string) {
  const [event, setEvent] = useState<Conference | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true);
    eventsApi.get(slug)
      .then((item) => { if (active) setEvent(item); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'This conference could not be found.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);
  return { event, loading, error };
}
