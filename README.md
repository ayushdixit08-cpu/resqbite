# ResQBite project

This repository keeps the frontend and backend in separate projects.

## Structure

- `frontend/` - React + Vite UI only
- `backend/` - Java Spring Boot API and database layer

## Frontend

The frontend remains visually unchanged and is configured with:

```env
# local development
VITE_API_URL=http://localhost:5000/api

# production (frontend/.env.production)
VITE_API_URL=https://resqbite-2.onrender.com/api
```

## Backend

The backend runs on:

```text
http://localhost:5000
```

with JWT-secured REST APIs and PostgreSQL connectivity through Spring Data JPA.

The active Render backend is `resqbite-2` at
`https://resqbite-2.onrender.com`. Configure the backend's
`CORS_ALLOWED_ORIGINS` Render variable with the deployed frontend origin
before redeploying.

## Communication flow

```text
Frontend -> REST API -> Spring Boot -> PostgreSQL
```
