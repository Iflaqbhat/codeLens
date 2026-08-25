import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { submissionSchema } from '../lib/validation'
import { fetchFromGitHubUrl } from '../lib/github'
import { generateAndSaveReview } from '../lib/reviewService'

const router = Router()

// POST /api/submissions/from-url — fetch code from a GitHub PR/file/gist link
router.post('/from-url', async (req, res) => {
  try {
    const parsed = z.object({ url: z.string().url() }).safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'A valid URL is required' })
    }

    const source = await fetchFromGitHubUrl(parsed.data.url)

    const submission = await prisma.submission.create({
      data: {
        userId: req.user!.userId,
        code: source.code,
        language: source.language,
        source: `${source.kind}: ${source.title}`,
      },
    })

    // Same pipeline as manual submissions — remark, explanations, tests, everything.
    // Fire-and-forget; the detail page polls until it lands.
    generateAndSaveReview(submission.id).catch((err) =>
      console.error('URL submission review failed:', err.message)
    )

    res.status(201).json({ id: submission.id, title: source.title, truncated: source.truncated })
  } catch (error: any) {
    console.error('from-url failed:', error.message)
    res.status(422).json({ error: error.message || 'Failed to fetch from GitHub' })
  }
})

// GET /api/submissions — list all submissions
router.get('/', async (req, res) => {
  try {
    const submissions = await prisma.submission.findMany({
      include: { reviews: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json(submissions)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch submissions' })
  }
})

// GET /api/submissions/:id — get one submission
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: { reviews: true },
    })
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' })
    }
    res.json(submission)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch submission' })
  }
})

// POST /api/submissions — create a new submission
router.post('/', async (req, res) => {
  try {
    const parsed = submissionSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() })
    }

    const submission = await prisma.submission.create({
      data: {
        userId: req.user!.userId,
        code: parsed.data.code,
        language: parsed.data.language,
      },
    })
    res.status(201).json(submission)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create submission' })
  }
})

// PUT /api/submissions/:id — update a submission
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const parsed = submissionSchema.partial().safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() })
    }

    const submission = await prisma.submission.update({
      where: { id },
      data: parsed.data,
    })
    res.json(submission)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update submission' })
  }
})

// DELETE /api/submissions/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    await prisma.submission.delete({ where: { id } })
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete submission' })
  }
})

export default router
