# ResQBite Spring Boot backend

This backend exposes the volunteer-to-NGO request, follow, connection, messaging, and opportunity APIs for the existing frontend.

## Run locally

From `backend/`:

```bash
set JAVA_HOME=C:\Program Files\Java\jdk-26.0.1
set SPRING_PROFILES_ACTIVE=test
mvn spring-boot:run
```

The app listens on `http://localhost:5000`.

The production service is `resqbite-2`:
`https://resqbite-2.onrender.com`.

Set `CORS_ALLOWED_ORIGINS` in Render to the deployed frontend origin
(comma-separated if more than one). Local defaults allow Vite development
origins.

## Frontend connection

Set the frontend environment to:

```env
VITE_API_URL=http://localhost:5000/api
```

The current frontend design is left unchanged; it continues to call the normal API endpoints.

## Main API groups

- `/api/auth/register`
- `/api/auth/login`
- `/api/organizations`
- `/api/volunteers`
- `/api/requests`
- `/api/requests/incoming`
- `/api/follows`
- `/api/connections`
- `/api/messages`
- `/api/opportunities`
- `/api/health`
