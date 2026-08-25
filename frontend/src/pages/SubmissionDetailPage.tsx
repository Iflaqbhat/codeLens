import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { marked } from 'marked'
import api from '../lib/api'
import { timeAgo, scoreColor, languageMeta } from '../lib/format'
import { useCountUp } from '../lib/useCountUp'
import { useToast } from '../context/ToastContext'
import TiltCard from '../components/TiltCard'

interface TestCase {
  description: string
  input: string
  expectedOutput: string
}

interface TestResult {
  description: string
  passed: boolean
  expected: string
  actual: string
  error?: string
}

interface Review {
  id: number
  aiFeedback: string
  score: number
  testCasesJson: string
  passRate: number | null
  remark: string | null
  improvedCode: string | null
  explanationEn: string | null
  explanationHi: string | null
  createdAt: string
}

interface Submission {
  id: number
  code: string
  language: string
  source: string | null
  createdAt: string
  reviews: Review[]
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="eyebrow" style={{ marginBottom: 8 }}>{children}</div>
}

function ScoreDonut({ score }: { score: number }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - score / 100)
  const color = scoreColor(score)
  const displayScore = useCountUp(score, 1100)

  return (
    <div style={{ position: 'relative', width: 132, height: 132, flexShrink: 0 }}>
      <svg width="132" height="132" style={{ transform: 'rotate(-90deg)' }}>
        <circle className="donut-track" cx="66" cy="66" r={radius} fill="none" strokeWidth="10" />
        <circle
          className="donut-value"
          cx="66" cy="66" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 30, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
            {displayScore}
          </div>
          <div className="faint" style={{ fontSize: 11 }}>out of 100</div>
        </div>
      </div>
    </div>
  )
}

const REVIEW_STEPS = [
  'Reading your code…',
  'Hunting for bugs…',
  'Checking style & security…',
  'Writing benchmark tests…',
  'Scoring quality…',
]

function ReviewingPanel() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % REVIEW_STEPS.length), 2200)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="card anim-pop" style={{ padding: 48, textAlign: 'center', marginTop: 24 }}>
      <span
        className="brand-glyph float-soft"
        style={{ width: 52, height: 52, borderRadius: 14, fontSize: 19, margin: '0 auto 22px', display: 'grid' }}
      >
        &lt;/&gt;
      </span>
      <h2 style={{ height: 26 }}>
        <span key={step} className="step-text" style={{ display: 'inline-block' }}>
          {REVIEW_STEPS[step]}
        </span>
      </h2>
      <p className="muted" style={{ marginTop: 8, marginBottom: 24 }}>
        Gemini is analyzing bugs, style, and security — then generating tests.
      </p>
      <div className="progress-track">
        <div className="progress-bar" />
      </div>
    </div>
  )
}

function ExplainSection({ review }: { review: Review }) {
  const [lang, setLang] = useState<'hi' | 'en'>('hi')
  const [text, setText] = useState<{ en: string | null; hi: string | null }>({
    en: review.explanationEn,
    hi: review.explanationHi,
  })
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    // Lazily generate for older reviews that don't have explanations stored
    const ensure = async () => {
      if (text.en || fetching) return
      setFetching(true)
      try {
        const res = await api.post(`/reviews/${review.id}/explain`)
        setText({ en: res.data.english, hi: res.data.hinglish })
      } catch {
        // silent — buttons just stay disabled
      } finally {
        setFetching(false)
      }
    }
    ensure()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review.id])

  const current = lang === 'hi' ? text.hi : text.en

  return (
    <section className="anim-rise" style={{ '--d': '100ms', marginTop: 16 } as React.CSSProperties}>
      <SectionLabel>Ye code karta kya hai</SectionLabel>
      <div className="card" style={{ padding: '18px 22px' }}>
        <div className="spread" style={{ flexWrap: 'wrap', gap: 12 }}>
          <p className="muted" style={{ fontSize: 13 }}>
            Simple words mein — bina jargon ke.
          </p>
          <div className="segmented small" style={{ margin: 0 }}>
            <div
              className="seg-indicator"
              style={{ transform: lang === 'hi' ? 'translateX(0)' : 'translateX(calc(100% + 4px))' }}
            />
            <button className={`seg-btn ${lang === 'hi' ? 'active' : ''}`} onClick={() => setLang('hi')}>
              🇮🇳 Hinglish
            </button>
            <button className={`seg-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>
              🇬🇧 English
            </button>
          </div>
        </div>

        <div style={{ marginTop: 14, minHeight: 48 }}>
          {fetching ? (
            <div className="row" style={{ gap: 10 }}>
              <span className="spinner" />
              <span className="muted" style={{ fontSize: 13.5 }}>Samjhata hoon…</span>
            </div>
          ) : current ? (
            <p key={lang} className="md fade-in-once" style={{ fontSize: 14.5 }}>
              {current}
            </p>
          ) : (
            <p className="faint" style={{ fontSize: 13 }}>Explanation could not be generated for this submission.</p>
          )}
        </div>
      </div>
    </section>
  )
}

export default function SubmissionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [improving, setImproving] = useState(false)
  const [showFixed, setShowFixed] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined

    const fetchSubmission = () =>
      api.get(`/submissions/${id}`)
        .then((res) => {
          setSubmission(res.data)
          if (res.data.reviews.length > 0 && interval) clearInterval(interval)
        })
        .catch(() => {
          setNotFound(true)
          if (interval) clearInterval(interval)
        })

    fetchSubmission()
    interval = setInterval(fetchSubmission, 2500)
    return () => interval && clearInterval(interval)
  }, [id])

  if (notFound) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="icon">🔍</div>
          <h2 style={{ textTransform: 'none' }}>Submission not found</h2>
          <Link to="/submissions" style={{ display: 'inline-block', marginTop: 14 }}>← Back to history</Link>
        </div>
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 32, width: 220, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 380 }} />
      </div>
    )
  }

  const review = submission.reviews[0]
  const lang = languageMeta(submission.language)
  const failed = review?.aiFeedback?.startsWith('⚠️')

  let cases: TestCase[] = []
  let results: TestResult[] | null = null
  if (review) {
    try {
      const parsed = JSON.parse(review.testCasesJson)
      if (Array.isArray(parsed)) {
        cases = parsed // legacy format
      } else {
        cases = parsed.cases ?? []
        results = parsed.results ?? null
      }
    } catch {}
  }

  const retry = async () => {
    setRetrying(true)
    try {
      await api.post('/reviews/generate', { submissionId: submission.id })
      toast('Review queued — hang tight!', 'success')
    } catch {
      toast('Retry failed. Check backend logs.', 'error')
    } finally {
      setRetrying(false)
    }
  }

  const improve = async () => {
    if (!review) return
    setImproving(true)
    try {
      const res = await api.post(`/reviews/${review.id}/improve`)
      const updated = { ...submission, reviews: [{ ...review, improvedCode: res.data.improvedCode }] }
      setSubmission(updated)
      setShowFixed(true)
      toast('Fixed version ready — bhai ab dekh le 🔥', 'success')
    } catch {
      toast('Could not improve code. Try again.', 'error')
    } finally {
      setImproving(false)
    }
  }

  const copyFixed = async () => {
    if (!review?.improvedCode) return
    await navigator.clipboard.writeText(review.improvedCode)
    toast('Copied to clipboard ✨', 'success')
  }

  // Submit the fixed code as a NEW submission and run the full review pipeline on it
  const reReviewFixed = async () => {
    if (!review?.improvedCode) return
    setRetrying(true)
    try {
      const res = await api.post('/submissions', {
        code: review.improvedCode,
        language: submission.language,
      })
      api.post('/reviews/generate', { submissionId: res.data.id }).catch(() => {})
      toast('Fixed version queued for a fresh review 🔁', 'success')
      navigate(`/submissions/${res.data.id}`)
    } catch {
      toast('Could not re-review the fixed code.', 'error')
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="page" style={{ maxWidth: 960 }}>
      {/* ---------- Header ---------- */}
      <div style={{ marginBottom: 20 }}>
        <Link to="/submissions" className="muted" style={{ fontSize: 13 }}>← History</Link>
        <div className="spread" style={{ marginTop: 6 }}>
          <div className="row">
            <h1>#{String(submission.id).padStart(3, '0')}</h1>
            <span className="badge badge-gray">
              <span className="dot" style={{ background: lang.color }} />
              {lang.label}
            </span>
            {submission.source && (
              <span className="badge badge-blue" title={submission.source}>
                🐙 {submission.source.split(': ')[1]?.slice(0, 36)}
              </span>
            )}
          </div>
          <span className="faint" style={{ fontSize: 13 }}>{timeAgo(submission.createdAt)}</span>
        </div>
      </div>

      {/* ---------- 1. The code ---------- */}
      <section>
        <SectionLabel>Your code · {submission.code.split('\n').length} lines</SectionLabel>
        <div className="card anim-rise" style={{ overflow: 'hidden' }}>
          <Editor
            height={review ? 320 : 420}
            language={submission.language}
            value={submission.code}
            theme="vs"
            options={{
              readOnly: true,
              fontSize: 13,
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              minimap: { enabled: false },
              padding: { top: 12 },
              scrollBeyondLastLine: false,
              renderLineHighlight: 'none',
            }}
          />
        </div>
      </section>

      {!review && <ReviewingPanel />}

      {review && failed && (
        <div className="card anim-rise" style={{ padding: 24, marginTop: 20 }}>
          <div className="row" style={{ gap: 10 }}>
            <span style={{ fontSize: 22 }}>⚠️</span>
            <h2>Review failed</h2>
          </div>
          <p className="muted mono" style={{ marginTop: 12, fontSize: 13, whiteSpace: 'pre-wrap' }}>{review.aiFeedback}</p>
          <button onClick={retry} disabled={retrying} className="btn btn-primary" style={{ marginTop: 16 }}>
            {retrying && <span className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />}
            Retry review
          </button>
        </div>
      )}

      {review && !failed && (
        <>
          {/* ---------- 2. The verdict ---------- */}
          <section className="anim-pop" style={{ '--d': '60ms', marginTop: 22 } as React.CSSProperties}>
            <SectionLabel>The verdict</SectionLabel>
            <div
              className="remark-card"
              style={{ borderColor: review.score >= 70 ? 'rgba(127,224,164,0.35)' : review.score >= 40 ? 'rgba(245,201,123,0.35)' : 'rgba(255,157,157,0.4)' }}
            >
              <div className="spread">
                <span className="remark-label">Gemini ka verdict</span>
                <span style={{ fontSize: 18 }}>
                  {review.score >= 90 ? '🤩' : review.score >= 70 ? '😎' : review.score >= 40 ? '😬' : '💀'}
                </span>
              </div>
              <div className="remark-quote">“{review.remark}”</div>
            </div>
          </section>

          {/* ---------- 2b. What this code does ---------- */}
          <ExplainSection review={review} />

          {/* ---------- 3. Score strip ---------- */}
          <section className="anim-pop" style={{ '--d': '120ms', marginTop: 16 } as React.CSSProperties}>
            <TiltCard className="card" max={5}>
              <div className="row" style={{ gap: 28, padding: '20px 26px', flexWrap: 'wrap' }}>
                <ScoreDonut score={review.score} />
                <div style={{ minWidth: 180 }}>
                  {review.passRate !== null ? (
                    <>
                      <div className="stat-value" style={{ fontSize: 32, color: review.passRate >= 0.7 ? 'var(--success)' : 'var(--danger)' }}>
                        {Math.round(review.passRate * 100)}%
                      </div>
                      <div className="stat-sub">of benchmark tests survived</div>
                    </>
                  ) : (
                    <>
                      <div className="stat-value" style={{ fontSize: 22 }}>—</div>
                      <div className="stat-sub">Tests didn't run (Docker off)</div>
                    </>
                  )}
                  {results && (
                    <div style={{ marginTop: 12 }}>
                      <span className={results.every(r => r.passed) ? 'badge badge-green' : 'badge badge-red'}>
                        {results.filter(r => r.passed).length}/{results.length} passed
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right', alignSelf: 'center' }}>
                  <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                    {review.score >= 70 ? 'Pass' : review.score >= 40 ? 'Meh' : 'Fail'}
                  </div>
                  <div className="faint" style={{ fontSize: 12 }}>overall grade</div>
                </div>
              </div>
            </TiltCard>
          </section>

          {/* ---------- 4. Feedback ---------- */}
          <section className="anim-rise" style={{ '--d': '160ms', marginTop: 22 } as React.CSSProperties}>
            <SectionLabel>What the AI found</SectionLabel>
            <div className="card" style={{ padding: '18px 22px' }}>
              <div
                className="md"
                dangerouslySetInnerHTML={{ __html: marked.parse(review.aiFeedback.replace(/^⚠️.*$/gm, '')) as string }}
              />
            </div>
          </section>

          {/* ---------- 5. Better code ---------- */}
          <section className="anim-rise" style={{ '--d': '200ms', marginTop: 22 } as React.CSSProperties}>
            <SectionLabel>Better code</SectionLabel>
            <div className="card" style={{ padding: '18px 22px' }}>
              <div className="spread" style={{ flexWrap: 'wrap' }}>
                <p className="muted" style={{ fontSize: 13.5, maxWidth: 480 }}>
                  One click — Gemini rewrites your snippet with every bug, security hole,
                  and style complaint from the review above, fixed.
                </p>
                {!showFixed && (
                  <button onClick={improve} disabled={improving} className="btn btn-primary">
                    {improving ? (
                      <>
                        <span className="spinner" style={{ borderTopColor: '#050506', borderColor: 'rgba(5,5,6,0.2)' }} />
                        Fixing galtiyan…
                      </>
                    ) : (
                      <>✨ {review.improvedCode ? 'Show fixed code' : 'Fix my code'}</>
                    )}
                  </button>
                )}
                {showFixed && (
                  <div className="row">
                    <button onClick={copyFixed} className="btn">📋 Copy</button>
                    <button
                      onClick={reReviewFixed}
                      disabled={retrying}
                      className="btn btn-primary"
                      title="Runs this fixed code through the full review pipeline — see if the score improves"
                    >
                      {retrying && <span className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />}
                      🔁 Review fixed version
                    </button>
                    <button onClick={() => setShowFixed(false)} className="btn btn-danger-ghost">Hide</button>
                  </div>
                )}
              </div>

              {improving && (
                <div style={{ marginTop: 18 }}>
                  <div className="progress-track"><div className="progress-bar" /></div>
                  <p className="faint" style={{ fontSize: 12.5, marginTop: 10 }}>
                    Senior engineer mode on… bugs khatam, style upgrade ho raha hai
                  </p>
                </div>
              )}

              {showFixed && review.improvedCode && (
                <div className="anim-rise" style={{ marginTop: 16 }}>
                  <Editor
                    height={Math.min(Math.max(review.improvedCode.split('\n').length * 19 + 40, 200), 520)}
                    language={submission.language}
                    value={review.improvedCode}
                    theme="vs"
                    options={{
                      readOnly: true,
                      fontSize: 13,
                      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      renderLineHighlight: 'none',
                      padding: { top: 12 },
                    }}
                  />
                </div>
              )}
            </div>
          </section>

          {/* ---------- 6. Benchmark tests ---------- */}
          {cases.length > 0 && (
            <section className="anim-rise" style={{ '--d': '240ms', marginTop: 22 } as React.CSSProperties}>
              <SectionLabel>Benchmark tests</SectionLabel>
              <div className="card" style={{ overflow: 'hidden' }}>
                <div
                  className="row"
                  style={{
                    margin: 14,
                    padding: '11px 14px',
                    background: 'var(--accent-soft)',
                    border: '1px solid rgba(159,215,255,0.2)',
                    borderRadius: 10,
                    gap: 10,
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={{ fontSize: 15, lineHeight: 1.4 }}>💡</span>
                  <span style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.55 }}>
                    Before grading you, the AI secretly wrote unit tests for your function — normal
                    inputs, tricky edge cases, and error cases — like a strict interviewer.{' '}
                    {results
                      ? <>Each one ran in an isolated Docker sandbox against <b>your</b> code. PASS = your output matched exactly.</>
                      : <>These haven't been executed yet — start Docker and hit retry to run them in a sandbox.</>}
                  </span>
                </div>

                {cases.map((tc, i) => {
                  const res = results?.find((r) => r.description === tc.description)
                  return (
                    <div
                      key={i}
                      className="test-row anim-rise"
                      style={{ '--d': `${i * 70}ms` } as React.CSSProperties}
                    >
                      <span className={`test-status badge ${res ? (res.passed ? 'badge-green' : 'badge-red') : 'badge-gray'}`}>
                        {res ? (res.passed ? 'PASS' : 'FAIL') : '—'}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div className="test-desc">{tc.description}</div>
                        <div className="test-detail">in: {tc.input}</div>
                        <div className="test-detail">expected: {tc.expectedOutput}</div>
                        {res && !res.passed && res.actual !== undefined && (
                          <div className="test-detail" style={{ color: 'var(--danger)' }}>actual: {res.actual || '(no output)'}</div>
                        )}
                        {res?.error && (
                          <div className="test-detail" style={{ color: 'var(--danger)' }}>{res.error.slice(0, 140)}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
