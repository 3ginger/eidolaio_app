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

### Frontend
**Deploy from ROOT** (not /client):
```bash
cd /Users/germangurov/projects/pareidolia-app
vercel --prod
```
Deploys to: https://eidola-app.vercel.app

### API
**Deploy from /api**:
```bash
cd /Users/germangurov/projects/pareidolia-app/api
vercel --prod
```
Deploys to: https://api-omega-opal-59.vercel.app

### Vercel Projects
- **Frontend**: `pareidolia-app` → eidola-app.vercel.app
- **API**: `api` → api-omega-opal-59.vercel.app

### Environment Variables
All secrets stored in Vercel. Local copy in root `.env.local` (gitignored):
- `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`
- `POSTGRES_URL` (Neon DB)
- `UPLOADTHING_APP_ID` / `UPLOADTHING_SECRET`
- `VITE_API_URL` / `VITE_CLERK_PUBLISHABLE_KEY`

To pull secrets locally:
```bash
cd api && vercel env pull ../.env.local --environment production
```

## Tech Stack
- Frontend: React, Vite, TypeScript, Tailwind CSS
- Auth: Clerk
- Deployment: Vercel
