# ResQBite project

This repository keeps the frontend and backend in separate projects.

## Structure

- `frontend/` - React + Vite UI only
- `backend/` - Java Spring Boot API and database layer

## Frontend

The frontend remains visually unchanged and is configured with:

```env
VITE_API_URL=http://localhost:5000/api
```

## Backend

The backend runs on:

```text
http://localhost:5000
```

with JWT-secured REST APIs and PostgreSQL connectivity through Spring Data JPA.

## Communication flow

```text
Frontend -> REST API -> Spring Boot -> PostgreSQL
```
