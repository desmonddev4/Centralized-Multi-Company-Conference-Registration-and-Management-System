# Backend development

From this directory, create a virtual environment, install requirements.txt, copy .env.example to .env, then run:

    python manage.py migrate
    python manage.py createsuperuser
    python manage.py setup_roles
    python manage.py runserver

## Deploy the backend to Render

The repository-root `render.yaml` is a Render Blueprint for the Django API and PostgreSQL database. In Render, create a new Blueprint from this repository and apply the `gci-conference-backend` service and `gci-conference-db` database. Both use Render's free plans for now.

During Blueprint setup, provide:

- `FRONTEND_URL`: the public frontend origin, such as `https://your-frontend.example.com`.
- `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`: comma-separated frontend origins, including the scheme, for example `https://your-frontend.example.com`. Add every production frontend origin; include `https://` in trusted origins.
- `PAYSTACK_CALLBACK_URL` and `PAYSTACK_SECRET_KEY` when enabling Paystack checkout.
- `PAYSTACK_USD_TO_GHS_RATE`: the fixed GHS-per-USD rate for online checkout (defaults to `11.7`). USD ticket prices remain displayed in USD; the checkout shows the GHS conversion, and Paystack receives the charge in GHS.
- `EMAIL_HOST`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, and `DEFAULT_FROM_EMAIL` for email. The default SMTP port is 587 with TLS enabled; configure a port supported by your provider if deploying on Render's free web plan.

The Blueprint generates `SECRET_KEY`, disables Django debug mode, serves collected Django static files with WhiteNoise, runs database migrations on service startup, and uses the public events API for its health check. If you attach a custom API domain, add that hostname to `ALLOWED_HOSTS` in the Render service environment.

Free-tier limitations: the web service spins down after 15 minutes without traffic, so its first request after idle can take about a minute. Its filesystem is ephemeral; use the configured PostgreSQL database for persistent data. Only one Free Postgres database can be active per workspace; it has 1 GB of storage, no backups, and expires after 30 days. Upgrade the database before expiry to retain access to its data; after the additional 14-day grace period, Render deletes it. Free web services cannot access Render's dashboard shell or send outbound SMTP traffic on ports 25, 465, or 587.

To create the initial Django administrator on the free plan, run `python manage.py createsuperuser` and `python manage.py setup_roles` from a trusted local environment configured with the Render database's external URL and the production Django environment variables. Do not commit or share the database URL. To deliver email from the free web service, use an SMTP provider that supports a port Render permits (for example, port 2525) and set `EMAIL_PORT`, or upgrade to a plan that permits standard SMTP ports. The `/attend` check-in page is part of the frontend; configure its frontend deployment to use this backend's `/api` URL.

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
- POST /api/check-ins/attend/ — attendee kiosk check-in. It is open only while a published conference is in progress, matches the attendee's name and normalized phone to one registration, and verifies a complimentary registration or its recorded Paystack/offline payment before recording entry. It also stores the attendee's job title, organization, and role.
- GET /api/check-ins/{registration_code}/ — authenticated staff look up a registration and its check-in state.
- GET /api/check-ins/ — check-in audit log (`checkin.view_checkinrecord`), with optional `?conference={slug}` filter.
- POST /api/check-ins/{registration_code}/ — record attendee entry; repeated requests return the existing check-in without creating a duplicate.
- GET /api/audit/ — owner-only, searchable audit activity with offset pagination.

Ticket prices are stored in integer minor units (for GHS, pesewas). Event date-times are stored as timezone-aware values. Draft conferences stay hidden from public event pages. Paid registration holds use the configured duration (15 minutes by default); pending payments must not be treated as confirmed tickets.

On event day, open the frontend at `/attend` on the attendee device. Attendees enter the same name and phone number used on their registration; the kiosk verifies payment records and records check-in before showing a QR contact card. Cash payments must first be recorded by staff using the walk-in registration workflow. Unmatched, ambiguous, or unverified registrations should be resolved at the registration desk.

Set `PAYSTACK_SECRET_KEY` in `backend/.env` before using online checkout. Use a Paystack test secret for development, never expose the secret in frontend configuration, and configure the Paystack webhook URL as `https://your-api-host/api/payments/paystack/webhook/`. Successful charges are independently verified with Paystack. If payment succeeds after ticket inventory has filled, the registration moves to `payment_review` for staff resolution instead of overselling.

Refund and settlement operations require finance permissions. Refund totals reserve amounts while the gateway request is pending or requires reconciliation; failed and reversed refunds release that reservation. Settlement synchronization is initiated from the admin screen and stores the Paystack response as a local reconciliation snapshot. Paystack statuses can update later by signed refund webhooks.

Staff sign-ins, conference changes, registration creation, payment outcomes, check-ins, and staff role/account changes are written to the audit log. The audit view is read-only in the app and avoids copying attendee emails or phone numbers into audit details.
