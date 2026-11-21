# Gymnasyum — Smart Reschedule Assistant (Frontend prototype)

A responsive React + Tailwind CSS frontend concept for the Dicoding capstone. The UI follows the project plan: an **admin-facing** workflow for reviewing reschedule requests, inspecting AI analysis, selecting available slots, and editing an AI reply draft. Admin keeps final control of approvals and replies.

## Run locally

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## What's included

- Overview dashboard and request statistics
- Search/filter requests by keyword and status
- Request detail, original customer message, mock AI intent/confidence, and extracted schedule preference
- Select an available slot and update the request status (local demo state only)
- Editable AI reply draft
- Schedule & slots screen
- Responsive sidebar/mobile navigation
- Light blue, white, light green palette

## Important

This is a **frontend-only prototype**. All data in `src/data/mockData.js` is illustrative mock data. Buttons update local React state only; there are no backend/API calls, real availability checks, real AI inference, or message sending yet.

When the backend/API contract is agreed, replace the mock data and local handlers in `src/App.jsx` with `fetch` calls to the team's API. Keep the API base URL in an environment variable, e.g. `VITE_API_BASE_URL`.
