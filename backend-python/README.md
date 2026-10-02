# ResQBite Python Backend

This folder contains a Django + DRF backend for the ResQBite food-rescue product.

## Stack
- Django
- Django REST Framework
- JWT authentication via `djangorestframework-simplejwt`
- PostgreSQL-ready config with SQLite fallback for local development
- Swagger docs via `drf-spectacular`

## Quick start

1. Create and activate a virtual environment
2. Install dependencies
   `pip install -r requirements.txt`
3. Copy `.env.example` to `.env` and edit values
4. Run migrations
   `python manage.py migrate`
5. Start the API
   `python manage.py runserver 0.0.0.0:5000`

## Main endpoints
- `/api/health/`
- `/api/auth/register/`
- `/api/auth/login/`
- `/api/auth/me/`
- `/api/organizations/`
- `/api/donations/`
- `/api/pickups/`
- `/api/analytics/overview/`
- `/api/docs/`
