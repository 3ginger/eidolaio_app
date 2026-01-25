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
Deploys to: https://eidola.io

### API
**Deploy from /api**:
```bash
cd /Users/germangurov/projects/pareidolia-app/api
vercel --prod
```
Deploys to: https://api.eidola.io

### Vercel Projects
- **Frontend**: `pareidolia-app` → eidola.io (www.eidola.io)
- **API**: `api` → api.eidola.io

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
- File Upload: Uploadthing (UPLOADTHING_TOKEN required, region: sea1)

## API Authentication Pattern

**IMPORTANT**: All authenticated API calls must include the Clerk token in the Authorization header.

### Pattern for API utility functions (`client/src/utils/api.ts`)
All API functions accept an optional `token` parameter:
```typescript
export async function post<T>(endpoint: string, data?: unknown, token?: string | null): Promise<T>
```

### Pattern for exported action functions (`client/src/hooks/usePosts.ts`)
Always accept token as a parameter:
```typescript
export async function likePost(postId: number, token?: string | null): Promise<{ liked: boolean }> {
  return post(`/posts/${postId}/like`, undefined, token)
}
```

### Pattern for hooks that make authenticated requests
Use `useAuth()` from Clerk inside the hook:
```typescript
export function useComments(postId: number | undefined) {
  const { getToken } = useAuth()
  // ...
  const addComment = async (content: string) => {
    const token = await getToken()
    await post(`/posts/${postId}/comments`, { content }, token)
  }
}
```

### Pattern for components calling authenticated functions
Get token from `useAuth()` and pass to functions:
```typescript
const { getToken } = useAuth()

const handleLike = async (postId: number) => {
  const token = await getToken()
  await likePost(postId, token)
}
```

### Debugging Auth Issues
If you see `x-clerk-auth-status: signed-out` in response headers, the request is missing the Authorization header. Check that:
1. The API function accepts and passes the token
2. The calling code gets the token via `getToken()` and passes it
