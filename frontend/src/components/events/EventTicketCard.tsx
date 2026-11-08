import type { Conference } from '../../api/events';
import { activeTickets, money } from './eventHelpers';

/* Sticky "save your place" card with a price preview and the ticket-dialog trigger. */
export default function EventTicketCard({ event, onSelect }: { event: Conference; onSelect: () => void }) {
  const tickets = activeTickets(event);
  return <aside className="ev-ticket-card">
    <p className="ev-ticket-card__eyebrow">Save your place</p>
    <h2>Registration</h2>
    {tickets.length > 0 ? <>
      <ul className="ev-ticket-card__list">{tickets.map((ticket) => <li key={ticket.id}><span>{ticket.name}</span><strong>{money(ticket.current_price_minor_units, ticket.currency)}</strong></li>)}</ul>
      <button type="button" className="pp-btn pp-btn--primary ev-ticket-card__button" onClick={onSelect}>Select ticket type <span aria-hidden="true">→</span></button>
    </> : <p className="ev-ticket-card__empty">Ticket details will be available soon.</p>}
    <p className="ev-ticket-card__note">Choose your ticket, then enter your details to reserve your place.</p>
  </aside>;
}
