import express from 'express'
import cors from 'cors'
import { clerkMiddleware } from '@clerk/express'
import 'dotenv/config'

import postsRouter from './routes/posts.js'
import challengesRouter from './routes/challenges.js'
import userRouter from './routes/user.js'
import feedRouter from './routes/feed.js'
import chainRouter from './routes/chain.js'
import uploadRouter from './routes/upload.js'
import adminRouter from './routes/admin.js'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'https://eidola.io',
  'https://www.eidola.io',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[]

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(null, true) // Allow all for now in demo mode
    }
  },
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))

// Clerk auth middleware (optional - works without config for development)
if (process.env.CLERK_SECRET_KEY) {
  app.use(clerkMiddleware())
}

// Health check
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
app.use('/api/posts', postsRouter)
app.use('/api/challenges', challengesRouter)
app.use('/api/user', userRouter)
app.use('/api/feed', feedRouter)
app.use('/api/chain', chainRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/admin', adminRouter)

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

// Only listen when running directly (not in Vercel serverless)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`)
  })
}

export default app
