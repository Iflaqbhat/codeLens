import { Router } from 'express'
import prisma from '../lib/prisma'
import { reviewSchema } from '../lib/validation'
import { generateAndSaveReview } from '../lib/reviewService'
import { explainCode } from '../lib/ai'

const router = Router()

// GET /api/reviews — list all reviews
router.get('/', async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      include: { submission: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json(reviews)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews' })
  }
})

// GET /api/reviews/:id
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const review = await prisma.review.findUnique({
      where: { id },
      include: { submission: true },
    })
    if (!review) {
      return res.status(404).json({ error: 'Review not found' })
    }
    res.json(review)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch review' })
  }
})

// POST /api/reviews/generate — run AI review + tests for a submission
router.post('/generate', async (req, res) => {
  try {
    const { submissionId } = req.body
    if (!submissionId) {
      return res.status(400).json({ error: 'submissionId is required' })
    }

    const review = await generateAndSaveReview(submissionId)
    res.status(201).json({ review })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate review' })
  }
})

// POST /api/reviews/:id/explain — get (or lazily generate) the code explanation
router.post('/:id/explain', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const review = await prisma.review.findUnique({
      where: { id },
      include: { submission: true },
    })
    if (!review) return res.status(404).json({ error: 'Review not found' })

    // Already have both? Return cached
    if (review.explanationEn && review.explanationHi) {
      return res.json({ english: review.explanationEn, hinglish: review.explanationHi, cached: true })
    }

    // Older review without explanations — generate now
    const explanation = await explainCode(review.submission.code, review.submission.language)
    await prisma.review.update({
      where: { id },
      data: { explanationEn: explanation.english, explanationHi: explanation.hinglish },
    })

    res.json({ ...explanation, cached: false })
  } catch (error: any) {
    console.error('Explain failed:', error)
    res.status(500).json({ error: error.message || 'Failed to explain code' })
  }
})

// POST /api/reviews/:id/improve — generate a fixed version of the reviewed code
router.post('/:id/improve', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const review = await prisma.review.findUnique({
      where: { id },
      include: { submission: true },
    })
    if (!review) return res.status(404).json({ error: 'Review not found' })

    // Cached — don't re-pay for the same improvement
    if (review.improvedCode) {
      return res.json({ improvedCode: review.improvedCode, cached: true })
    }

    const { generateImprovedCode } = await import('../lib/ai')
    const improved = await generateImprovedCode(
      review.submission.code,
      review.submission.language,
      review.aiFeedback
    )

    await prisma.review.update({
      where: { id },
      data: { improvedCode: improved },
    })

    res.json({ improvedCode: improved, cached: false })
  } catch (error: any) {
    console.error('Improve failed:', error)
    res.status(500).json({ error: error.message || 'Failed to improve code' })
  }
})

// POST /api/reviews — create a review manually (admin/testing helper)
router.post('/', async (req, res) => {
  try {
    const parsed = reviewSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() })
    }

    const review = await prisma.review.create({
      data: {
        submissionId: parsed.data.submissionId,
        aiFeedback: parsed.data.aiFeedback,
        score: parsed.data.score,
        testCasesJson: parsed.data.testCasesJson,
        passRate: parsed.data.passRate,
      },
    })
    res.status(201).json(review)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create review' })
  }
})

export default router
