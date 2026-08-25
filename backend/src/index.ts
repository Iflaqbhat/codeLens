import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth'
import submissionsRouter from './routes/submissions'
import reviewsRouter from './routes/reviews'
import { authMiddleware } from './middleware/auth'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Public routes
app.use('/api/auth', authRouter)

// Protected routes
app.use('/api/submissions', authMiddleware, submissionsRouter)
app.use('/api/reviews', authMiddleware, reviewsRouter)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
