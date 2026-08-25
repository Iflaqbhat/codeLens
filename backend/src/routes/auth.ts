import { Router } from 'express'
import { hashSync, compareSync } from 'bcryptjs'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { generateToken } from '../lib/auth'

const router = Router()

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const parsed = signupSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() })
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    })
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        passwordHash: hashSync(parsed.data.password, 10),
        name: parsed.data.name,
      },
    })

    const token = generateToken({ userId: user.id, email: user.email })
    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } })
  } catch (error) {
    res.status(500).json({ error: 'Signup failed' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() })
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    })
    if (!user || !compareSync(parsed.data.password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = generateToken({ userId: user.id, email: user.email })
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } })
  } catch (error) {
    res.status(500).json({ error: 'Login failed' })
  }
})

export default router
