import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import PublicLayout from '../../components/layout/PublicLayout';
import { eventsApi, type IssuedTicket } from '../../api/events';
import './TicketPage.css';

export default function TicketPage() {
  const { registrationCode = '' } = useParams();
  const [ticket, setTicket] = useState<IssuedTicket | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { eventsApi.ticket(registrationCode).then(setTicket).catch((cause) => setError(cause instanceof Error ? cause.message : 'Ticket could not be loaded.')); }, [registrationCode]);
  return <PublicLayout><main className="ticket-page"><Link className="ticket-back" to={'/registrations/'+registrationCode}>← Registration details</Link>{ticket ? <article className="ticket-card"><header><p className="eyebrow">CONFERENCE ADMISSION</p><h1>{ticket.conference_title}</h1><p>{ticket.ticket_name}</p></header><section className="ticket-body"><div className="ticket-attendee"><span>ATTENDEE</span><strong>{ticket.attendee_name}</strong></div><div className="ticket-details"><div><span>DATE &amp; TIME</span><strong>{new Intl.DateTimeFormat(undefined,{dateStyle:'long',timeStyle:'short'}).format(new Date(ticket.starts_at))}</strong></div><div><span>VENUE</span><strong>{ticket.venue_name || 'See conference details'}</strong>{ticket.venue_address&&<small>{ticket.venue_address}</small>}</div></div><div className="ticket-qr"><QRCodeSVG value={ticket.registration_code} size={184} level="M"/><span>{ticket.registration_code}</span><small>Present this QR code at the entrance</small></div></section><footer className="ticket-actions"><button className="button button--dark" onClick={() => window.print()}>Print ticket</button><Link className="button button--quiet" to={'/events'}>Browse conferences</Link></footer></article> : <section className="ticket-error"><p className="eyebrow">YOUR CONFERENCE TICKET</p><h1>{error ? 'Ticket unavailable' : 'Loading ticket…'}</h1>{error&&<><p>{error}</p><Link className="button button--dark" to={'/registrations/'+registrationCode}>View registration</Link></>}</section>}</main></PublicLayout>;
}
