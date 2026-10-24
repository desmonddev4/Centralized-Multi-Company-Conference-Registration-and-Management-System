# Conference Management Platform

Centralized conference registration and management for the group’s companies. The codebase is split into independent `backend/` and `frontend/` applications.

## Project layout

- `backend/` — Django REST API, domain apps, integrations, and backend configuration.
- `frontend/` — React + TypeScript multi-page application. Every route page and shared layout component has its own stylesheet alongside its component.
- `docs/` — product requirements, architecture, and operational decisions.

See [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) for the page map and conventions. The conference and ticket-category management flow is implemented as the first connected feature; see [backend/README.md](backend/README.md) for local API setup.
