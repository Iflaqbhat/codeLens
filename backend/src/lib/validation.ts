import { z } from 'zod'

export const submissionSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  language: z.string().min(1, 'Language is required'),
})

export const reviewSchema = z.object({
  submissionId: z.number().int().positive(),
  aiFeedback: z.string().min(1),
  score: z.number().min(0).max(100),
  testCasesJson: z.string(),
  passRate: z.number().min(0).max(1).optional(),
})
