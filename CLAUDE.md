# Eidola (Pareidolia App)

A social platform for sharing pareidolia discoveries — faces and patterns spotted in everyday objects.

## Project Structure

```
pareidolia-app/
├── client/          # React frontend (Vite + TypeScript)
├── api/             # Backend API
├── api-func/        # Serverless functions
└── vercel.json      # Root deployment config
```

## Deployment

**IMPORTANT: Always deploy from the project ROOT, not from /client**

```bash
cd /Users/germangurov/projects/pareidolia-app
vercel --prod
```

This deploys to: https://eidola-app.vercel.app

### Vercel Projects
- **Frontend**: `pareidolia-app` → eidola-app.vercel.app
- **API**: `api` → eidola-api.vercel.app

### Environment Variables
See `.env.local` for required variables (Clerk keys, API URLs, etc.)

## Tech Stack
- Frontend: React, Vite, TypeScript, Tailwind CSS
- Auth: Clerk
- Deployment: Vercel
