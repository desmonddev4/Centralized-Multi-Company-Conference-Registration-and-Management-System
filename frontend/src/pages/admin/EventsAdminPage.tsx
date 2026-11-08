import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import EmptyState from '../../components/feedback/EmptyState';
import { eventsApi, type Company, type Conference, type ConferenceInput, type EventStatus, type TicketCategoryInput } from '../../api/events';
import './EventsAdminPage.css';

type TicketDraft = { id?: number; name: string; price: string; earlyPrice: string; earlyCloses: string; currency: string; quantity: string; description: string };
type FormState = { company: string; title: string; description: string; banner_url: string; registration_url: string; venue_name: string; venue_address: string; starts_at: string; ends_at: string; registration_opens_at: string; registration_closes_at: string; capacity: string; status: EventStatus };
const emptyForm: FormState = { company: '', title: '', description: '', banner_url: '', registration_url: '', venue_name: '', venue_address: '', starts_at: '', ends_at: '', registration_opens_at: '', registration_closes_at: '', capacity: '', status: 'draft' };
const emptyTicket: TicketDraft = { name: '', price: '', earlyPrice: '', earlyCloses: '', currency: 'GHS', quantity: '', description: '' };
function toLocal(value: string | null) { if (!value) return ''; const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
function toIso(value: string) { return value ? new Date(value).toISOString() : null; }
function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)); }

export default function EventsAdminPage() {
  const [events, setEvents] = useState<Conference[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState<Conference | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [tickets, setTickets] = useState<TicketDraft[]>([{ ...emptyTicket }]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [eventData, companyData] = await Promise.all([eventsApi.list(filter === 'all' ? undefined : filter), eventsApi.companies()]);
      setEvents(eventData);
      setCompanies(companyData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load conferences. Check that the backend is running.');
    } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  const visibleEvents = useMemo(() => events.filter((event) => (event.title + ' ' + event.company_name + ' ' + event.venue_name).toLowerCase().includes(search.toLowerCase())), [events, search]);
  const openCreate = () => { setEditing(null); setForm({ ...emptyForm, company: companies[0] ? String(companies[0].id) : '' }); setTickets([{ ...emptyTicket }]); setError(''); setNotice(''); setFormOpen(true); };
  const openEdit = (event: Conference) => {
    setEditing(event);
    setFormOpen(true);
    setForm({ company: String(event.company), title: event.title, description: event.description, banner_url: event.banner_url, registration_url: event.registration_url, venue_name: event.venue_name, venue_address: event.venue_address, starts_at: toLocal(event.starts_at), ends_at: toLocal(event.ends_at), registration_opens_at: toLocal(event.registration_opens_at), registration_closes_at: toLocal(event.registration_closes_at), capacity: event.capacity === null ? '' : String(event.capacity), status: event.status });
    setTickets(event.ticket_categories.length ? event.ticket_categories.map((ticket) => ({ id: ticket.id, name: ticket.name, description: ticket.description, price: (ticket.price_minor_units / 100).toFixed(2), earlyPrice: ticket.early_price_minor_units===null?'':(ticket.early_price_minor_units/100).toFixed(2), earlyCloses: toLocal(ticket.early_sales_close_at), currency: ticket.currency, quantity: String(ticket.quantity_available) })) : [{ ...emptyTicket }]);
    setError(''); setNotice('');
  };
  const setField = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const setTicket = (index: number, key: keyof TicketDraft, value: string) => setTickets((current) => current.map((ticket, i) => i === index ? { ...ticket, [key]: value } : ticket));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    if (!form.company) { setError('Create or select a company before adding a conference.'); setSaving(false); return; }
    const categories: TicketCategoryInput[] = tickets.filter((ticket) => ticket.name.trim()).map((ticket, index) => ({ ...(ticket.id ? { id: ticket.id } : {}), name: ticket.name.trim(), description: ticket.description.trim(), price_minor_units: Math.round(Number(ticket.price || 0) * 100), early_price_minor_units: ticket.earlyPrice.trim()?Math.round(Number(ticket.earlyPrice)*100):null, early_sales_close_at: ticket.earlyPrice.trim()?toIso(ticket.earlyCloses):null, currency: ticket.currency.trim().toUpperCase()||'GHS', quantity_available: Number(ticket.quantity || 0), max_per_registration: 1, sort_order: index }));
    const payload: ConferenceInput = { company: Number(form.company), title: form.title.trim(), description: form.description.trim(), banner_url: form.banner_url.trim(), registration_url: form.registration_url.trim(), venue_name: form.venue_name.trim(), venue_address: form.venue_address.trim(), starts_at: toIso(form.starts_at) || '', ends_at: toIso(form.ends_at) || '', registration_opens_at: toIso(form.registration_opens_at), registration_closes_at: toIso(form.registration_closes_at), capacity: form.capacity ? Number(form.capacity) : null, status: form.status, ticket_categories: categories };
    try {
      if (editing) await eventsApi.update(editing.slug, payload); else await eventsApi.create(payload);
      setNotice(editing ? 'Conference updated.' : 'Conference created.');
      setEditing(null);
      setFormOpen(false);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save conference.'); }
    finally { setSaving(false); }
  }

  return <AdminLayout title="Conferences" eyebrow="EVENT MANAGEMENT">
    <div className="events-toolbar"><div className="events-search"><span>?</span><input aria-label="Search conferences" placeholder="Search conferences…" value={search} onChange={(event) => setSearch(event.target.value)}/></div><label className="filter-control"><span>Status</span><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="cancelled">Cancelled</option><option value="archived">Archived</option></select></label><button className="button button--dark" onClick={openCreate}>+ New conference</button></div>
    {error&&<div className="events-alert" role="alert"><strong>Couldn’t complete that request.</strong><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss">×</button></div>}
    {notice&&<div className="events-success" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
    {companies.length===0&&!loading&&<div className="events-info"><strong>No companies found.</strong> Add a company in the Companies workspace, then refresh this page.</div>}
    <section className="events-table-card"><div className="events-table-head"><div><h2>All conferences</h2><p>{visibleEvents.length} {visibleEvents.length===1?'conference':'conferences'}</p></div><button className="events-refresh" onClick={() => void load()} disabled={loading} aria-label="Refresh conferences">?</button></div>
      {loading?<div className="events-loading"><span/>Loading conferences…</div>:visibleEvents.length===0?<EmptyState title="No conferences found" message={search?'Try another search or clear the filter.':'Create a conference to start setting up your event calendar.'}/>:<div className="events-table-wrap"><table className="events-table"><thead><tr><th>CONFERENCE</th><th>ORGANIZING COMPANY</th><th>DATE</th><th>TICKET TYPES</th><th>STATUS</th><th/></tr></thead><tbody>{visibleEvents.map((event) => <tr key={event.id}><td><strong>{event.title}</strong><small>{event.venue_name || 'Venue to be confirmed'}</small></td><td>{event.company_name}</td><td>{formatDate(event.starts_at)}</td><td>{event.ticket_categories.length}</td><td><span className={'conference-status '+event.status}>{event.status}</span></td><td><Link className="events-edit" to={`/admin/events/${encodeURIComponent(event.slug)}/operations`}>Operations</Link><button className="events-edit" onClick={() => openEdit(event)}>Edit</button></td></tr>)}</tbody></table></div>}
    </section>
    {formOpen&&<div className="conference-modal-backdrop" role="presentation" onMouseDown={(event) => { if(event.target===event.currentTarget){setFormOpen(false);setEditing(null);} }}><section className="conference-modal" role="dialog" aria-modal="true" aria-labelledby="conference-form-title"><header className="conference-modal__header"><div><p className="eyebrow">{editing?'UPDATE DETAILS':'EVENT SETUP'}</p><h2 id="conference-form-title">{editing?'Edit conference':'Create a conference'}</h2></div><button type="button" onClick={() => {setFormOpen(false);setEditing(null);}} aria-label="Close dialog">×</button></header>
      <form onSubmit={submit}><div className="conference-form-scroll">
        <fieldset><legend>Conference details</legend><label className="form-field form-field--full">Conference title<input required maxLength={200} value={form.title} onChange={(event) => setField('title',event.target.value)} placeholder="e.g. Ghana Innovation Summit"/></label><label className="form-field">Organizing company<select required value={form.company} onChange={(event) => setField('company',event.target.value)}><option value="">Select company</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label><label className="form-field">Status<select value={form.status} onChange={(event) => setField('status',event.target.value as EventStatus)}><option value="draft">Draft</option><option value="published">Published</option><option value="cancelled">Cancelled</option><option value="archived">Archived</option></select></label><label className="form-field form-field--full">Description<textarea rows={3} value={form.description} onChange={(event) => setField('description',event.target.value)} placeholder="What is this conference about?"/></label><label className="form-field form-field--full">Banner image URL<input type="url" value={form.banner_url} onChange={(event) => setField('banner_url',event.target.value)} placeholder="https://…"/></label><label className="form-field form-field--full">External registration URL<input type="url" value={form.registration_url} onChange={(event) => setField('registration_url',event.target.value)} placeholder="Leave blank to use this hub's registration flow"/><small>When set, attendee registration buttons open this provider's registration page.</small></label></fieldset>
        <fieldset><legend>Venue and schedule</legend><label className="form-field">Venue<input value={form.venue_name} onChange={(event) => setField('venue_name',event.target.value)} placeholder="Venue name"/></label><label className="form-field">Address<input value={form.venue_address} onChange={(event) => setField('venue_address',event.target.value)} placeholder="City, country"/></label><label className="form-field">Starts<input required type="datetime-local" value={form.starts_at} onChange={(event) => setField('starts_at',event.target.value)}/></label><label className="form-field">Ends<input required type="datetime-local" value={form.ends_at} onChange={(event) => setField('ends_at',event.target.value)}/></label><label className="form-field">Registration opens<input type="datetime-local" value={form.registration_opens_at} onChange={(event) => setField('registration_opens_at',event.target.value)}/></label><label className="form-field">Registration closes<input type="datetime-local" value={form.registration_closes_at} onChange={(event) => setField('registration_closes_at',event.target.value)}/></label><label className="form-field">Conference capacity<input type="number" min="1" value={form.capacity} onChange={(event) => setField('capacity',event.target.value)} placeholder="No limit"/></label></fieldset>
        <fieldset><div className="ticket-fieldset-title"><legend>Ticket categories</legend><button type="button" className="add-ticket" onClick={() => setTickets((current) => [...current,{...emptyTicket}])}>+ Add ticket type</button></div><p className="ticket-helper">Set the standard price, plus an optional early price and its deadline. Prices are stored in minor units using the currency code.</p>{tickets.map((ticket,index)=><div className="ticket-draft" key={ticket.id||index}><div className="ticket-draft__top"><strong>Ticket {index+1}</strong>{tickets.length>1&&!ticket.id&&<button type="button" onClick={() => setTickets((current) => current.filter((_,i)=>i!==index))}>Remove</button>}</div><label className="form-field">Ticket name<input value={ticket.name} onChange={(event)=>setTicket(index,'name',event.target.value)} placeholder="General admission"/></label><label className="form-field">Standard price<input type="number" min="0" step="0.01" value={ticket.price} onChange={(event)=>setTicket(index,'price',event.target.value)} placeholder="0.00"/></label><label className="form-field">Early price (optional)<input type="number" min="0" step="0.01" value={ticket.earlyPrice} onChange={(event)=>setTicket(index,'earlyPrice',event.target.value)} placeholder="0.00"/></label><label className="form-field">Early price ends<input type="datetime-local" required={Boolean(ticket.earlyPrice)} value={ticket.earlyCloses} onChange={(event)=>setTicket(index,'earlyCloses',event.target.value)}/></label><label className="form-field">Currency<input required maxLength={3} minLength={3} value={ticket.currency} onChange={(event)=>setTicket(index,'currency',event.target.value)} placeholder="USD"/></label><label className="form-field">Quantity<input type="number" required min="1" value={ticket.quantity} onChange={(event)=>setTicket(index,'quantity',event.target.value)} placeholder="100"/></label></div>)}</fieldset>
      </div><footer className="conference-modal__footer">{error&&<p role="alert">{error}</p>}<button type="button" className="button button--quiet" onClick={() => {setFormOpen(false);setEditing(null);}}>Cancel</button><button className="button button--dark" disabled={saving}>{saving?'Saving…':editing?'Save changes':'Create conference'}</button></footer></form>
    </section></div>}
  </AdminLayout>;
}

