# ResQBite Django REST API

ResQBite's Python backend is built with Django, Django REST Framework, PostgreSQL, and SimpleJWT. Django apps keep accounts, organizations, donations, pickups, volunteers, tracking, notifications, reviews, rewards, complaints, emergency requests, events, and analytics separate.

## Requirements and local setup

- Python 3.10+
- PostgreSQL 14+ for normal use
- A Cloudinary account for production image/document storage

```powershell
cd backend-python
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env` before starting. PostgreSQL is the default database. To create the local role and database, connect to the PostgreSQL server as its administrator:

```sql
CREATE ROLE resqbite LOGIN PASSWORD 'replace-with-a-secret';
CREATE DATABASE resqbite OWNER resqbite;
ALTER ROLE resqbite WITH CREATEDB;
```

`CREATEDB` is required so Django can create the temporary PostgreSQL test database when running `python manage.py test`. Set `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, and `DB_PORT` in `.env` to match that database and role. Use a strong password and keep `.env` private. SQLite is available only for local development when `DEBUG=True`; set `DB_ENGINE=sqlite3` to use it. Production refuses to start without a real `SECRET_KEY` and `CLOUDINARY_URL`.

```powershell
python manage.py check
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 127.0.0.1:8000
```

During local development, `frontend/.env.development` points the Vite app at
`http://127.0.0.1:8000/api`. Django's default CORS origins allow both
`http://localhost:5173` and `http://127.0.0.1:5173`.

Do not commit `.env` or production secrets. Use a real SMTP provider in production; the example configuration prints verification and password-reset emails to the console.

## API conventions

- Base URL: `http://127.0.0.1:8000/api`
- Authentication: `Authorization: Bearer <access-token>`
- Registration/login return `success`, `message`, and `data` containing `access`, `refresh`, and `user`. The legacy `token` field is an alias for the access token.
- Paginated list responses contain `data.count`, `data.next`, `data.previous`, and `data.results`. Set `page` and `page_size` (maximum 100).
- Validation/authentication errors use `success: false`, a message, and field errors.
- Donation image uploads use `multipart/form-data`, repeat the `images` field for each image, and include JSON-compatible `food_safety` fields. JPEG, PNG, and WebP are accepted up to `MAX_UPLOAD_SIZE`.

## Main routes

| Area | Routes |
| --- | --- |
| Authentication | `POST /auth/register/`, `/auth/login/`, `/auth/logout/`, `/auth/token/refresh/`; `GET /auth/me/`; `GET/PATCH /auth/profile/`; `/auth/password-reset/`; `/auth/email-verification/` |
| NGOs | `GET /ngos/`, `/ngos/{id}/`, `/ngos/nearby/`; `POST/PATCH /ngos/profile/`; admin `POST /ngos/{id}/verify/` |
| Donations | `GET/POST /donations/`, `GET/PATCH/DELETE /donations/{id}/`, `/donations/my/`, `/donations/history/`, `/donations/search/`, `/donations/nearby/`, `/donations/{id}/cancel/`, `/donations/{id}/status/` |
| NGO requests | `POST/GET /donation-requests/`, `GET /donation-requests/{id}/`, `POST /donation-requests/{id}/accept/` or `/reject/`; the legacy `/donations/requests/` routes remain available |
| Volunteers and delivery | `/volunteers/profile/`, `/volunteers/nearby/`, `/volunteers/tasks/`, `/volunteers/tasks/{id}/accept/`, `/volunteers/tasks/{id}/status/`, `/volunteers/tasks/history/`; `/pickups/` |
| Tracking and QR | `GET /tracking/donation/{id}/`, `GET /tracking/{event_id}/`, `POST /tracking/location/`; `POST /donations/qr/{id}/generate/`, `/donations/qr/verify/` |
| Notifications and reviews | `/notifications/`, `/notifications/{id}/read/`, `/notifications/read-all/`; `/reviews/`, `/reviews/user/{id}/`, `/reviews/donation/{id}/` |
| Additional modules | `/emergency-requests/`, `/events/`, `/rewards/me/`, `/rewards/leaderboard/`, `/rewards/badges/`, `/complaints/` |
| Analytics and admin | `/analytics/overview/`, `/analytics/weekly/`, `/analytics/food-mix/`, `/analytics/impact/`; `/admin/dashboard/`, `/admin/users/`, `/admin/ngos/`, `/admin/donations/`, `/admin/deliveries/`, `/admin/reports/` |
| Documentation | `GET /api/health/`, `/api/schema/`, `/api/docs/` |

## Important behavior

- Public registration cannot create an administrator. Administrators must be provisioned through Django's management/admin tooling.
- Organization profiles start unverified. Only an admin can verify them; only verified organizations can request donations.
- Available-donation endpoints exclude expired donations. Donation requests are unique per organization and donation; acceptance locks the donation row and a conditional database constraint prevents multiple accepted NGOs.
- Volunteer status transitions are enforced. Pickup and delivery completion require the assigned volunteer to use the single-use, expiring QR token.
- Donation status history is append-only in tracking events. Only the latest volunteer location is retained.
- Reviews are only allowed after delivery completion and are unique per donation/reviewer/recipient.
- Reward points are recorded as ledger entries only after verified completion. Clients cannot set points.
- AI endpoints return HTTP 503 until a real provider is configured; no synthetic quality or recommendation results are returned.
- Impact figures are explicitly estimates and use environment-configurable factors.

## Security and production

Configure a strong unique `SECRET_KEY`, separate `JWT_SECRET_KEY`, HTTPS, `ALLOWED_HOSTS`, explicit `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, SMTP, PostgreSQL, and Cloudinary in the deployment environment. The API uses Django password validation and BCrypt-SHA256 hashing, ORM parameterization, JWT blacklisting, role checks, object-level ownership checks, throttling, and validated image uploads.

## Migrations, tests, and OpenAPI

```powershell
python manage.py makemigrations
python manage.py migrate
python manage.py test
python manage.py spectacular --validate --file openapi.yaml
```

Swagger UI is available at `/api/docs/`; the OpenAPI document is served from `/api/schema/`. `postman/ResQBite.postman_collection.json` covers the main authentication, donation, NGO, volunteer, pickup, tracking/QR, notification, review, emergency, complaint, reward, event, analytics, and admin flows. The live PostgreSQL deployment must be configured separately; local SQLite tests do not prove remote database connectivity.

## React/Vite integration

Set `VITE_API_BASE_URL=http://127.0.0.1:8000/api` for local development. Store the access token returned by login and send it in the `Authorization` header. Use JSON for ordinary requests and `FormData` for image uploads. The React API client unwraps successful `{success, message, data}` envelopes while preserving server error messages.
