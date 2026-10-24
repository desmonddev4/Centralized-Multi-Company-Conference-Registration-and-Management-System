# Local development with Docker

The root `compose.yaml` starts PostgreSQL, the Django API, and the Vite frontend. The stack is for local development; it binds the web ports to localhost and uses development-only database credentials.

From the repository root:

```sh
docker compose up --build
```

Open the frontend at <http://localhost:5173>. The API is available at <http://localhost:8000/api/>. Django applies migrations when the backend container starts. To create an administrator account in another terminal, run:

```sh
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py setup_roles
```

Stop the services with `docker compose down`. PostgreSQL data remains in the `postgres_data` volume; `docker compose down -v` deletes that local database volume.

The compose file deliberately does not configure Paystack credentials. Add a test key through a local, untracked environment file only if online payment testing is needed. Do not use the development secrets or database password in a deployed environment.
