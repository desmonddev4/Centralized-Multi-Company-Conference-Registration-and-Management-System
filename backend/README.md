# Backend development

From this directory, create a virtual environment, install requirements.txt, copy .env.example to .env, then run:

    python manage.py migrate
    python manage.py createsuperuser
    python manage.py setup_roles
    python manage.py runserver

Sign in at http://127.0.0.1:8000/admin/. Add the group companies there; the conference page reads company choices from /api/companies/. The same administrator session authorizes conference creation and editing from the frontend.

The initial superuser can create and assign staff accounts and roles in the app after running `setup_roles`. Role permissions apply across every company in the shared system. The Business Owner group is protected from editing in the app; assign it only to trusted owner accounts. Login is available through `/api/auth/login/`; authenticated admin and staff pages require a staff session.

API routes:

- GET /api/events/ — published conferences for public visitors and staff without conference-view permission; assigned conference managers and business owners can also view drafts.
- POST /api/events/ — create a conference with ticket categories (event-manager permission).
- GET/PATCH/PUT /api/events/{slug}/ — read or update a conference.
- GET /api/agenda-sessions/?conference={slug} — list a conference agenda; published agenda sessions are also included on public event detail.
- POST /api/agenda-sessions/ — add a session to a conference. PATCH/DELETE /api/agenda-sessions/{id}/ update or remove it. Session times must fit within the conference schedule. Event managers with `events.change_conference` may manage sessions; all changes are audited.
- GET/POST /api/events/{public_id}/ticket-categories/ — list or add ticket categories.
- GET /api/companies/ — active company choices publicly; staff with `companies.view_company` can view active and inactive companies.
- POST /api/companies/ and PATCH /api/companies/{id}/ — create and edit company details. Deactivation preserves conference history; company changes are audited.
- POST /api/events/{slug}/registrations/ — create one attendee registration. Free tickets confirm immediately; paid tickets reserve inventory for the configured hold duration (15 minutes by default).
- GET /api/registration-codes/{code}/ — retrieve the confirmation details using the high-entropy registration code.
- GET /api/tickets/{code}/ — issue or retrieve a confirmed attendee’s ticket details; the public ticket QR encodes the unique registration code.
- GET /api/tickets/delivery/ — list confirmed registration ticket/email delivery states (`registrations.view_registration`).
- POST /api/tickets/delivery/{code}/resend/ — issue the ticket if needed and retry its email (`registrations.change_registration`). Resend attempts are audited; failed delivery remains visible for follow-up.
- POST /api/auth/password-reset/ and POST /api/auth/password-reset/confirm/ — email a time-limited staff password reset link and accept a new password. Configure the `EMAIL_*` and `DEFAULT_FROM_EMAIL` variables before deploying so messages can be delivered.

The example environment uses Django’s console email backend for local development; ticket and password reset messages appear in the backend terminal. For production, switch `EMAIL_BACKEND` to `django.core.mail.backends.smtp.EmailBackend` and provide the SMTP host, port, credentials, TLS setting, and a real `DEFAULT_FROM_EMAIL`.
- GET /api/registrations/ — staff-only attendee registration records.
- POST /api/payments/initialize/{registration_code}/ — initialize Paystack checkout for a live paid registration hold.
- GET /api/payments/verify/{reference}/ — verify the transaction with Paystack and update the registration only after matching its amount, currency, and reference.
- POST /api/payments/paystack/webhook/ — receive signed Paystack webhook events; configure this URL in the Paystack dashboard.
- GET /api/payments/ — staff-only payment activity.
- GET /api/payments/offline-collections/ — cash/MoMo walk-in collection ledger (`payments.view_payment`), filterable by `method`, `conference`, `from`, and `to`. New entries record the receiving staff member and optional receipt or provider reference; older records are backfilled without inventing missing attribution.
- GET /api/payments/reviews/ — finance permission queue of verified Paystack charges awaiting a capacity decision.
- POST /api/payments/reviews/{registration_code}/resolve/ — confirm a reviewed attendee when ticket and conference capacity permit, or cancel the registration with a recorded reason so the refund can be submitted separately.
- GET /api/payments/refunds/ and POST /api/payments/refunds/ — list refunds and submit a full or partial refund for a paid registration. Paystack refunds are asynchronous; cash and MoMo entries record an offline refund as completed and must only be submitted after staff return the funds.
- POST /api/payments/refunds/{public_id}/refresh/ — retrieve the latest Paystack status for a refund with a provider refund ID. Signed refund webhooks also update tracked refunds.
- GET /api/payments/settlements/ — view locally synchronized Paystack settlement snapshots.
- POST /api/payments/settlements/sync/ — import a page of Paystack settlement summaries.
- GET /api/payments/settlements/{paystack_id}/transactions/ — import settlement transactions and match them to successful payments only when reference, amount, and currency agree.
- GET /api/reporting/dashboard/?period=12m — permission-checked summary for registrations, confirmed tickets, check-ins, net revenue, upcoming conferences, and conference performance. Supported periods are `30d`, `90d`, `12m`, and `all`; an optional `conference` slug scopes the report. Finance totals are included only for users with `payments.view_payment`.
- GET /api/settings/ — public platform name, support contacts, and registration hold duration.
- PATCH /api/settings/ — Business Owner (`core.change_platformsettings`) updates public identity and the hold duration for new paid registrations. Provider secrets remain environment-only.
- GET /api/operations/readiness/ — Business Owner-only operational check for database, migrations, Django security settings, Paystack mode, email backend configuration, and frontend URL. It reports configuration state only; it does not test live provider delivery or reveal secret values.
- POST /api/walk-ins/ — authenticated staff create confirmed at-venue registrations and record cash or MoMo received.
- GET /api/check-ins/{registration_code}/ — authenticated staff look up a registration and its check-in state.
- GET /api/check-ins/ — check-in audit log (`checkin.view_checkinrecord`), with optional `?conference={slug}` filter.
- POST /api/check-ins/{registration_code}/ — record attendee entry; repeated requests return the existing check-in without creating a duplicate.
- GET /api/audit/ — owner-only, searchable audit activity with offset pagination.

Ticket prices are stored in integer minor units (for GHS, pesewas). Event date-times are stored as timezone-aware values. Draft conferences stay hidden from public event pages. Paid registration holds use the configured duration (15 minutes by default); pending payments must not be treated as confirmed tickets.

Set `PAYSTACK_SECRET_KEY` in `backend/.env` before using online checkout. Use a Paystack test secret for development, never expose the secret in frontend configuration, and configure the Paystack webhook URL as `https://your-api-host/api/payments/paystack/webhook/`. Successful charges are independently verified with Paystack. If payment succeeds after ticket inventory has filled, the registration moves to `payment_review` for staff resolution instead of overselling.

Refund and settlement operations require finance permissions. Refund totals reserve amounts while the gateway request is pending or requires reconciliation; failed and reversed refunds release that reservation. Settlement synchronization is initiated from the admin screen and stores the Paystack response as a local reconciliation snapshot. Paystack statuses can update later by signed refund webhooks.

Staff sign-ins, conference changes, registration creation, payment outcomes, check-ins, and staff role/account changes are written to the audit log. The audit view is read-only in the app and avoids copying attendee emails or phone numbers into audit details.
