# Project structure and implementation map

## Product decisions captured so far

- One platform serves all companies in the group, with no company boundary in the user experience or access model. Keep company/event attribution on records so reports can still be filtered and compared.
- The business owns the payment merchant account. Paystack handles online payments, subject to merchant onboarding and settlement confirmation.
- Walk-in payments may be recorded as cash or mobile money (MoMo).
- Every registration receives its own unique registration code. Attendees are identified by their full name and registration code; do not assume a person may register only once.
- The product scope includes online and walk-in registration, payments and refunds, tickets, check-in, reporting and settlement reconciliation, users and permissions, audit, privacy, and operations.

## Frontend page map

Public pages: home, event listing, event details, registration, checkout, payment result, and ticket view.

Account pages: sign-in and password reset.

Administration pages: dashboard, companies and company operations, conferences and conference operations, conference program, registrations and registration details, attendees, ticket delivery, check-in log, payments, offline collections, payment reviews, refunds, settlements, reports, users, roles, audit log, system readiness, and platform settings.

Venue staff pages: walk-in registration and check-in.

Each route has a `.tsx` file and a matching `.css` file in `src/pages/<area>/`. Shared navigation, footer, admin sidebar, and application layouts live in `src/components/`, each with its own stylesheet. Keep route components focused on page composition; move reusable behavior into `src/features/` and API access into `src/api/`.

## Backend app map

- `accounts`: authentication, roles, permissions, and staff assignments.
- `companies`: company profiles and branding.
- `events`: conferences, ticket categories, schedules, and capacity.
- `registrations`: attendee details, registration lifecycle, and unique codes.
- `payments`: Paystack transactions, cash/MoMo records, refunds, webhook idempotency, and settlement reconciliation.
- `ticketing`: ticket issuance and validation.
- `checkin`: scans, manual lookup, duplicate prevention, and attendance records.
- `reporting`: company/event operational and finance reports and exports.
- `audit`: sensitive action history.
- `core`: shared configuration and health endpoints.

Enforce company/event access in backend authorization and querysets. A frontend route or hidden control is never an authorization boundary. Payment state and ticket validity are server-owned. Record cash/MoMo as distinct tender types with staff attribution and an auditable confirmation workflow. Store money as integer minor units with an explicit currency. Model collected, refunded, charged back, and settled amounts separately.

## Implemented conference foundation

The companies and events apps define company, conference, ticket-category, and agenda-session records. The Companies page manages company details and activation; edits are audited, and deactivation preserves conference history. Platform Settings controls the public platform name, support contacts, and the reservation hold for new paid registrations. The registrations app creates one registration per attendee with a high-entropy unique code; the same person can register more than once. Free tickets confirm immediately, while paid registrations reserve inventory for the configured hold duration and remain pending payment. The `/api/events/` endpoints expose published conferences publicly and require an authenticated Django session for writes. Ticket prices use minor units (GHS pesewas). Admin conference tools manage conference details, ticket categories, and a separate session agenda. Public event detail includes the published conference agenda.

## Operational questions to resolve during requirements/design

- Venue connectivity and recovery: online-first check-in, device/network fallback, and later reconciliation behavior.
- Which attendee fields are mandatory beyond full name, how consent/privacy notices are presented, retention/deletion rules, and who can export personal data.
- Whether a registration code may be reissued, and how staff handle name corrections or duplicate registrations.
- Cash/MoMo evidence, who may mark a payment received, who may approve refunds/voids, and how cash is reconciled after an event.
- Currency, time zone per event, ticket capacity holds/expiry, transfer/cancellation rules, and chargeback handling.

## Naming and styling conventions

- Use descriptive PascalCase component names and matching filenames.
- Co-locate page/component CSS with its component; global reset, fonts, and design tokens belong in `src/styles/`.
- Do not put application source in the repository root: keep it under `backend/` or `frontend/`.
