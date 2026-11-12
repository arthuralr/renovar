<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/33faecfa-b5f5-4025-8ad7-9d63f1d78df2

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Google Sheets persistence

Budgets are saved to and loaded from the Google Sheets Web App configured by
`VITE_GOOGLE_SHEETS_API_URL`. Set it in `.env.local` to the deployed Apps Script
`/exec` URL when using a different spreadsheet integration. The server-side
relay also accepts `GOOGLE_SHEETS_API_URL`; it is used when the browser cannot
read the Apps Script response because of CORS.

The app confirms a cloud save before advancing to the next wizard step. The
Kanban and budget list refresh from the cloud when opened and periodically while
visible; a failed cloud request is shown in the app rather than silently
presenting the browser's local cache as current data.

The matching Google Apps Script source is in [apps-script/Code.gs](./apps-script/Code.gs).
Deploy it as a Web App with access enabled for the intended users and update
`VITE_GOOGLE_SHEETS_API_URL` (and `GOOGLE_SHEETS_API_URL` for the server relay)
to the new deployment URL. The script reads and writes the `Página1` tab; for a
standalone script, set the `SPREADSHEET_ID` Script Property before deployment.
Deletion is permanent: the script removes every row whose proposal ID exactly
matches in the detected ID/code column (first column when no ID header exists).
