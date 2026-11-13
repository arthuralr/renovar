# Patologias.Lab

Aplicação de diagnóstico de patologias prediais e elaboração de propostas.

## Run Locally

**Prerequisites:** Node.js and a PostgreSQL database (Neon.tech is supported).

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and configure `GEMINI_API_KEY`,
   `DATABASE_URL`, and `VITE_API_URL`.
3. Configure `CORS_ORIGIN` on the API server with the frontend's origin when
   the frontend and API are hosted on different domains.
4. Start the app with `npm run dev`.

## PostgreSQL persistence

Budgets are created, loaded, updated, and deleted through the Express API at
`/api/orcamentos`. The API persists records in the PostgreSQL table
`propostas_renovar`; its startup check creates the table only when it does not
exist and preserves existing records.

`DATABASE_URL` is used only by the backend and must not be exposed in frontend
configuration. `VITE_API_URL` is the API server's base URL, such as
`https://api.example.com`; it is embedded in the frontend at build time. When it
is unset, the frontend uses the current origin, which is suitable when the
frontend and API are served together. For cross-origin deployments, set
`CORS_ORIGIN` on the API server to the exact frontend origin (for example
`https://app.example.com`).

Inspection photos are retained as Base64 data URLs within the budget's JSON
record in PostgreSQL. They are not uploaded to a separate file-storage service.
