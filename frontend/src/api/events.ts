export type EventStatus = 'draft' | 'published' | 'cancelled' | 'archived';
export type TicketCategory = { id: number; name: string; description: string; price_minor_units: number; early_price_minor_units: number | null; early_sales_close_at: string | null; current_price_minor_units: number; currency: string; quantity_available: number; max_per_registration: number; sales_open_at: string | null; sales_close_at: string | null; is_active: boolean; sort_order: number; remaining_quantity: number };
export type AgendaSession = { id:number; conference:number; conference_slug:string; title:string; description:string; speaker_name:string; starts_at:string; ends_at:string; venue_name:string; sort_order:number; created_at:string; updated_at:string };
export type AgendaSessionInput = Pick<AgendaSession,'conference'|'title'|'description'|'speaker_name'|'starts_at'|'ends_at'|'venue_name'|'sort_order'>;
export type Conference = { id: number; public_id: string; slug: string; company: number; company_name: string; title: string; description: string; banner_url: string; registration_url: string; venue_name: string; venue_address: string; starts_at: string; ends_at: string; registration_opens_at: string | null; registration_closes_at: string | null; capacity: number | null; status: EventStatus; ticket_categories: TicketCategory[]; agenda_sessions:AgendaSession[]; created_at: string; updated_at: string };
export type Company = { id:number; name:string; slug:string; logo_url:string; contact_email:string; contact_phone:string; is_active:boolean; conference_count:number; created_at:string; updated_at:string };
export type CompanyInput = { name:string; contact_email:string; contact_phone:string; is_active:boolean };
export type PlatformSettings = { platform_name:string; support_email:string; support_phone:string; registration_hold_minutes:number; updated_at:string };
export type ReadinessCheck = { key:string; label:string; status:'ok'|'warning'|'error'; detail:string };
export type SystemReadiness = { overall_status:'ok'|'warning'|'error'; checks:ReadinessCheck[] };
export type TicketCategoryInput = { id?: number; name: string; description?: string; price_minor_units: number; early_price_minor_units: number | null; early_sales_close_at: string | null; currency: string; quantity_available: number; max_per_registration: number; sort_order: number };
export type ConferenceInput = { company: number; title: string; description: string; banner_url: string; registration_url: string; venue_name: string; venue_address: string; starts_at: string; ends_at: string; registration_opens_at: string | null; registration_closes_at: string | null; capacity: number | null; status: EventStatus; ticket_categories: TicketCategoryInput[] };
export type RegistrationStatus = 'pending_payment' | 'confirmed' | 'payment_review' | 'cancelled' | 'expired';
export type Registration = { registration_code: string; full_name: string; status: RegistrationStatus; amount_due_minor_units: number; currency: string; paystack_amount_minor_units: number; paystack_currency: string; paystack_exchange_rate: string | null; hold_expires_at: string | null; created_at: string; conference_title: string; conference_slug: string; ticket_category_name: string; starts_at: string };
export type AdminRegistration = Registration & { company_name: string; email: string; phone: string; job_title: string; organization: string; attendee_role: KioskAttendanceInput['role'] | ''; payment_method: 'none' | 'paystack' | 'cash' | 'momo'; payment_received_at: string | null };
export type RegistrationInput = { ticket_category: number; full_name: string; email: string; phone?: string };
export type Payment = { reference: string; status: 'initializing' | 'initialized' | 'pending' | 'failed' | 'abandoned' | 'succeeded' | 'review'; amount_minor_units: number; currency: string; authorization_url: string; registration_code: string; created_at: string };
export type OfflineCollection = { id:number; registration_code:string; attendee_name:string; conference_slug:string; conference_title:string; company_name:string; ticket_name:string; method:'cash'|'momo'; amount_minor_units:number; currency:string; receipt_reference:string; received_by_name:string; received_at:string };
export type PaymentReview = { registration_code:string; full_name:string; email:string; conference_title:string; company_name:string; ticket_category_name:string; amount_due_minor_units:number; currency:string; payment_received_at:string; payment_reference:string; paystack_transaction_id:number };
export type Refund = { public_id:string; registration_code:string; attendee_name:string; conference_title:string; company_name:string; ticket_name:string; method:'paystack'|'cash'|'momo'; original_payment_method:string; status:string; amount_minor_units:number; currency:string; reason:string; payment_reference:string; paystack_refund_id:number|null; gateway_message:string; expected_at:string|null; requested_by_name:string; completed_by_name:string; processed_at:string|null; created_at:string };
export type Settlement = { paystack_id:number; status:string; currency:string; total_amount_minor_units:number; effective_amount_minor_units:number; total_fees_minor_units:number; total_processed_minor_units:number; settlement_date:string|null; synced_at:string; transaction_count:number };
export type SettlementTransaction = { paystack_id:number; reference:string; status:string; amount_minor_units:number; currency:string; channel:string; message:string; paid_at:string|null; registration_code:string|null };
export type PaginatedSync<T> = { results:T[]; meta:Record<string, number> };
export type WalkInInput = { conference: string; ticket_category: number; full_name: string; email: string; phone: string; payment_method: 'cash' | 'momo'; payment_reference?:string };
export type CheckInRecord = { registration: Registration; checked_in_at: string; checked_in_by_name: string };
export type CheckInLogEntry = { registration_code:string; attendee_name:string; conference_title:string; conference_slug:string; company_name:string; ticket_name:string; checked_in_at:string; checked_in_by_name:string };
export type CheckInLookup = { registration: Registration; checked_in: boolean; record: CheckInRecord | null };
export type KioskAttendanceInput = { conference: string; full_name: string; phone: string; job_title: string; organization: string; role: 'attendee'|'speaker'|'sponsor'|'exhibitor'|'organizer'|'media'|'other' };
export type KioskAttendee = { full_name: string; phone: string; job_title: string; organization: string; role: KioskAttendanceInput['role']; conference_title: string; ticket_category_name: string; registration_code: string; payment_method: 'none'|'paystack'|'cash'|'momo'; checked_in_at: string };
export type KioskAttendanceResult = { detail: string; already_checked_in: boolean; attendee: KioskAttendee };
export type IssuedTicket = { registration_code:string; attendee_name:string; ticket_name:string; conference_title:string; venue_name:string; venue_address:string; starts_at:string; ends_at:string; issued_at:string };
export type TicketDelivery = { registration_code:string; attendee_name:string; email:string; conference_title:string; company_name:string; ticket_name:string; registration_status:RegistrationStatus; ticket_issued:boolean; issued_at:string|null; email_sent_at:string|null; email_error:string };
export type StaffRole = { id: number; name: string; permissions: number[] };
export type StaffUser = { id: number; username: string; email: string; full_name: string; is_active: boolean; is_superuser: boolean; permissions?:string[]; groups: {id:number;name:string}[] };
export type SystemPermission = { id: number; app: string; codename: string; name: string };
export type AuditEntry = { id:number; actor_name:string; action:string; target_type:string; target_id:string; summary:string; details:Record<string,unknown>; ip_address:string|null; created_at:string };
export type ReportingData = { period:string; conference:string|null; financial_access:boolean; summary:{registration_count:number;confirmed_count:number;paid_registration_count:number|null;check_in_count:number;check_in_rate:number;gross_revenue:{currency:string;amount_minor_units:number}[];processed_refunds:{currency:string;amount_minor_units:number}[];net_revenue:{currency:string;amount_minor_units:number}[]};trend:{label:string;registrations:number;check_ins:number}[];upcoming_conferences:{slug:string;title:string;venue_name:string;starts_at:string;registration_count:number}[];conference_performance:{slug:string;title:string;company_name:string;starts_at:string;status:string;registration_count:number;confirmed_count:number;revenue_by_currency:{currency:string;amount_minor_units:number}[]}[];generated_at:string};

/* Without an explicit URL the API is assumed to be on the same host as the page (port 8000). Keeping the host identical
   matters: the CSRF and session cookies are not sent between localhost and 127.0.0.1. */
const API_BASE = (import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:8000/api`).replace(/\/$/, '');
let platformSettingsCache:Promise<PlatformSettings>|null=null;
let csrfToken = '';
function cookie(name: string) { return document.cookie.split('; ').find((item) => item.startsWith(name + '='))?.split('=').slice(1).join('='); }
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set('Content-Type', 'application/json');
  const csrf = cookie('csrftoken') || csrfToken;
  if (csrf && options.method && options.method !== 'GET') headers.set('X-CSRFToken', decodeURIComponent(csrf));
  const response = await fetch(API_BASE + path, { ...options, headers, credentials: 'include' });
  if (!response.ok) {
    let message = 'Request failed (' + response.status + ')';
    let diagnosticId = '';
    let failureCode = '';
    try {
      const body = await response.json();
      if (typeof body === 'string') message = body;
      else if (body.detail) {
        message = body.detail;
        diagnosticId = typeof body.diagnostic_id === 'string' ? body.diagnostic_id : '';
        failureCode = typeof body.code === 'string' ? body.code : '';
      }
      else message = Object.entries(body).map(([key, value]) => key + ': ' + (Array.isArray(value) ? value.join(', ') : String(value))).join(' · ');
    } catch { /* empty error response */ }
    if (diagnosticId) message += ' (Code: ' + failureCode + ' · Support reference: ' + diagnosticId + ')';
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json() as T;
  if (typeof data === 'object' && data !== null && 'csrf_token' in data && typeof data.csrf_token === 'string') {
    csrfToken = data.csrf_token;
  }
  return data;
}
export const eventsApi = {
  list(status?: string) { return request<Conference[]>('/events/' + (status ? '?status=' + encodeURIComponent(status) : '')); },
  companies() { return request<Company[]>('/companies/'); },
  createCompany(input:CompanyInput) { return request<Company>('/companies/',{method:'POST',body:JSON.stringify(input)}); },
  updateCompany(id:number,input:CompanyInput) { return request<Company>('/companies/'+id+'/',{method:'PATCH',body:JSON.stringify(input)}); },
  get(slug: string) { return request<Conference>('/events/' + encodeURIComponent(slug) + '/'); },
  agendaSessions(conference:string) { return request<AgendaSession[]>('/agenda-sessions/?conference='+encodeURIComponent(conference)); },
  createAgendaSession(input:AgendaSessionInput) { return request<AgendaSession>('/agenda-sessions/',{method:'POST',body:JSON.stringify(input)}); },
  updateAgendaSession(id:number,input:AgendaSessionInput) { return request<AgendaSession>('/agenda-sessions/'+id+'/',{method:'PATCH',body:JSON.stringify(input)}); },
  deleteAgendaSession(id:number) { return request<void>('/agenda-sessions/'+id+'/',{method:'DELETE'}); },
  create(input: ConferenceInput) { return request<Conference>('/events/', { method: 'POST', body: JSON.stringify(input) }); },
  update(slug: string, input: ConferenceInput) { return request<Conference>('/events/' + encodeURIComponent(slug) + '/', { method: 'PUT', body: JSON.stringify(input) }); },
  register(slug: string, input: RegistrationInput) { return request<Registration>('/events/' + encodeURIComponent(slug) + '/registrations/', { method: 'POST', body: JSON.stringify(input) }); },
  registration(code: string) { return request<Registration>('/registration-codes/' + encodeURIComponent(code) + '/'); },
  ticket(code:string) { return request<IssuedTicket>('/tickets/'+encodeURIComponent(code)+'/'); },
  ticketDelivery() { return request<TicketDelivery[]>('/tickets/delivery/'); },
  resendTicketEmail(code:string) { return request<TicketDelivery>('/tickets/delivery/'+encodeURIComponent(code)+'/resend/',{method:'POST',body:'{}'}); },
  registrations(status?: string) { return request<AdminRegistration[]>('/registrations/' + (status ? '?status=' + encodeURIComponent(status) : '')); },
  initializePayment(code: string) { return request<Payment>('/payments/initialize/' + encodeURIComponent(code) + '/', { method: 'POST', body: '{}' }); },
  verifyPayment(reference: string) { return request<Payment>('/payments/verify/' + encodeURIComponent(reference) + '/'); },
  payments() { return request<Payment[]>('/payments/'); },
  offlineCollections(input:{method?:string;conference?:string;from?:string;to?:string}={}) { const params=new URLSearchParams();Object.entries(input).forEach(([key,value])=>{if(value)params.set(key,value);});return request<OfflineCollection[]>('/payments/offline-collections/'+(params.size?'?'+params.toString():'')); },
  paymentReviews() { return request<PaymentReview[]>('/payments/reviews/'); },
  resolvePaymentReview(code:string,input:{action:'confirm'|'cancel';reason?:string}) { return request<{detail:string;status:string;refund_required:boolean}>('/payments/reviews/'+encodeURIComponent(code)+'/resolve/',{method:'POST',body:JSON.stringify(input)}); },
  refunds() { return request<Refund[]>('/payments/refunds/'); },
  createRefund(input:{registration_code:string;amount_minor_units:number;reason:string}) { return request<Refund>('/payments/refunds/',{method:'POST',body:JSON.stringify(input)}); },
  refreshRefund(id:string) { return request<Refund>('/payments/refunds/'+encodeURIComponent(id)+'/refresh/',{method:'POST',body:'{}'}); },
  settlements() { return request<Settlement[]>('/payments/settlements/'); },
  syncSettlements(page=1) { return request<PaginatedSync<Settlement>>('/payments/settlements/sync/',{method:'POST',body:JSON.stringify({page})}); },
  settlementTransactions(id:number,page=1) { return request<PaginatedSync<SettlementTransaction>>('/payments/settlements/'+id+'/transactions/?page='+page); },
  reporting(period='12m',conference='') { const params=new URLSearchParams({period});if(conference)params.set('conference',conference);return request<ReportingData>('/reporting/dashboard/?'+params.toString()); },
  walkIn(input: WalkInInput) { return request<Registration>('/walk-ins/', { method: 'POST', body: JSON.stringify(input) }); },
  checkInLookup(code: string) { return request<CheckInLookup>('/check-ins/' + encodeURIComponent(code) + '/'); },
  kioskAttendance(input: KioskAttendanceInput) { return request<KioskAttendanceResult>('/check-ins/attend/', { method: 'POST', body: JSON.stringify(input) }); },
  checkInLog(conference='') { const params=new URLSearchParams();if(conference)params.set('conference',conference);return request<CheckInLogEntry[]>('/check-ins/'+(params.size?'?'+params.toString():'')); },
  checkIn(code: string) { return request<{ detail: string; record: CheckInRecord }>('/check-ins/' + encodeURIComponent(code) + '/', { method: 'POST', body: '{}' }); },
};

export const accountsApi = {
  session() { return request<{authenticated:boolean;user:StaffUser|null;csrf_token:string}>('/auth/session/'); },
  requestPasswordReset(email:string) { return request<{detail:string}>('/auth/password-reset/',{method:'POST',body:JSON.stringify({email})}); },
  confirmPasswordReset(uid:string,token:string,password:string) { return request<{detail:string}>('/auth/password-reset/confirm/',{method:'POST',body:JSON.stringify({uid,token,password})}); },
  login(username:string,password:string) { return request<{authenticated:boolean;user:StaffUser;csrf_token:string}>('/auth/login/',{method:'POST',body:JSON.stringify({username,password})}); },
  logout() { return request<void>('/auth/logout/',{method:'POST',body:'{}'}); },
  users() { return request<StaffUser[]>('/auth/users/'); },
  createUser(input:{username:string;email:string;full_name:string;password:string;groups:number[]}) { return request<StaffUser>('/auth/users/',{method:'POST',body:JSON.stringify(input)}); },
  updateUser(id:number,input:Partial<{email:string;full_name:string;is_active:boolean;groups:number[]}>) { return request<StaffUser>('/auth/users/'+id+'/',{method:'PATCH',body:JSON.stringify(input)}); },
  roles() { return request<StaffRole[]>('/auth/roles/'); },
  createRole(input:{name:string;permissions:number[]}) { return request<StaffRole>('/auth/roles/',{method:'POST',body:JSON.stringify(input)}); },
  updateRole(id:number,input:Partial<{name:string;permissions:number[]}>) { return request<StaffRole>('/auth/roles/'+id+'/',{method:'PATCH',body:JSON.stringify(input)}); },
  deleteRole(id:number) { return request<void>('/auth/roles/'+id+'/',{method:'DELETE'}); },
  permissions() { return request<SystemPermission[]>('/auth/permissions/'); },
};
export const auditApi = {
  list(input:{search?:string;action?:string;offset?:number;limit?:number}={}) { const params=new URLSearchParams();Object.entries(input).forEach(([key,value])=>{if(value!==undefined&&value!=='')params.set(key,String(value));});return request<{count:number;offset:number;limit:number;results:AuditEntry[]}>('/audit/'+(params.size?'?'+params.toString():'')); },
};
export const platformSettingsApi = {
  get() { if(!platformSettingsCache)platformSettingsCache=request<PlatformSettings>('/settings/').catch(error=>{platformSettingsCache=null;throw error;});return platformSettingsCache; },
  async update(input:Pick<PlatformSettings,'platform_name'|'support_email'|'support_phone'|'registration_hold_minutes'>) { const value=await request<PlatformSettings>('/settings/',{method:'PATCH',body:JSON.stringify(input)});platformSettingsCache=Promise.resolve(value);window.dispatchEvent(new CustomEvent('platform-settings-updated',{detail:value}));return value; },
};
export const operationsApi = {
  readiness() { return request<SystemReadiness>('/operations/readiness/'); },
};
