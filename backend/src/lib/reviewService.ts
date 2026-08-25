import prisma from './prisma'
import { reviewCode } from './ai'
import { runInSandbox } from './sandbox'

/**
 * Single source of truth for generating + persisting a review.
 * Used by BOTH manual submissions and GitHub URL submissions,
 * so every path gets the same remark, explanations, and sandbox results.
 */
export async function generateAndSaveReview(submissionId: number) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
  })
  if (!submission) throw new Error('Submission not found')

  // If a successful review already exists, return it (idempotent)
  const existing = await prisma.review.findFirst({ where: { submissionId } })
  if (existing && !existing.aiFeedback.startsWith('⚠️')) {
    return existing
  }
  // Purge stale failed attempts so we can retry
  if (existing) {
    await prisma.review.delete({ where: { id: existing.id } })
  }

  try {
    const result = await reviewCode(submission.code, submission.language)

    // Sandbox is optional — app still works without Docker
    let passRate: number | null = null
    let sandboxResults: any[] | null = null
    try {
      const sandboxResult = runInSandbox(submission.code, submission.language, result.testCases)
      passRate = sandboxResult.passRate
      sandboxResults = sandboxResult.results

      const testSummary = sandboxResult.results
        .map((r) => `${r.passed ? '✅' : '❌'} ${r.description}`)
        .join('\n')
      result.summary += `\n\n**Test Results (${sandboxResult.passed}/${sandboxResult.total}):**\n${testSummary}`
    } catch (sandboxError) {
      console.error('Sandbox execution failed:', sandboxError)
    }

    const review = await prisma.review.create({
      data: {
        submissionId,
        aiFeedback:
          result.summary +
          '\n\n**Bugs:**\n' + result.bugs.map((b) => `- ${b}`).join('\n') +
          '\n\n**Style Issues:**\n' + result.styleIssues.map((s) => `- ${s}`).join('\n') +
          '\n\n**Security Concerns:**\n' + result.securityConcerns.map((s) => `- ${s}`).join('\n') +
          '\n\n**Complexity:** ' + result.complexityScore + '/100',
        score: result.overallScore,
        testCasesJson: JSON.stringify({ cases: result.testCases, results: sandboxResults }),
        passRate,
        remark: result.sarcasticRemark,
        explanationEn: result.explanationEnglish || null,
        explanationHi: result.explanationHinglish || null,
      },
    })

    return review
  } catch (error: any) {
    console.error('Review generation failed:', error)

    // Persist the failure so the frontend stops polling and shows WHY
    const stillEmpty = !(await prisma.review.findFirst({ where: { submissionId } }))
    if (stillEmpty) {
      await prisma.review.create({
        data: {
          submissionId,
          aiFeedback:
            '⚠️ AI review failed.\n\nReason: ' +
            (error.status === 401 || error.status === 403
              ? 'Invalid/expired AI API key.'
              : error.message || 'Unknown error'),
          score: 0,
          testCasesJson: '[]',
        },
      })
    }
    throw error
  }
}
