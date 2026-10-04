# ResQBite

ResQBite is a React/Vite food-rescue app backed by a Django REST API and PostgreSQL.

## Local development

### 1. Start PostgreSQL

Start your local PostgreSQL service and make sure the `resqbite` database and
role configured in `backend-python/.env` exist.

### 2. Start Django

From `backend-python/`, activate the project's Python environment and run:

```powershell
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

The API health check is `http://127.0.0.1:8000/api/health/` and the interactive
API documentation is `http://127.0.0.1:8000/api/docs/`.

### 3. Start React/Vite

In a separate terminal:

```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173/`. The development API URL is configured in
`frontend/.env.development` as `http://127.0.0.1:8000/api`. Django CORS allows
both `localhost:5173` and `127.0.0.1:5173`.

Use `backend-python/.env.example` to configure Django and PostgreSQL. Do not
commit `.env` files or database credentials. The production API URL can be
configured later with the frontend `VITE_API_BASE_URL` environment variable.
