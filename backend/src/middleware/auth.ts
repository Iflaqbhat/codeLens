import { Request, Response, NextFunction } from 'express'
import { verifyToken, TokenPayload } from '../lib/auth'

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    const token = header.slice(7)
    req.user = verifyToken(token)
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
