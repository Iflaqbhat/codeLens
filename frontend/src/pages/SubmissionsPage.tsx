import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { timeAgo, scoreBadgeClass, languageMeta } from '../lib/format'

interface Submission {
  id: number
  code: string
  language: string
  createdAt: string
  reviews: { score: number; passRate: number | null }[]
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[] | null>(null)

  useEffect(() => {
    api.get('/submissions')
      .then((res) => setSubmissions(res.data))
      .catch(() => setSubmissions([]))
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="eyebrow">Archive</span>
          <h1>Review <span className="serif-accent" style={{ color: 'var(--accent)' }}>history</span></h1>
          <p className="muted" style={{ marginTop: 4, fontSize: 14.5 }}>
            {submissions ? `${submissions.length} submission${submissions.length === 1 ? '' : 's'}` : 'Loading…'}
          </p>
        </div>
        <Link to="/submit"><button className="btn btn-primary">+ New review</button></Link>
      </div>

      {!submissions && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="card" style={{ padding: 16 }}>
              <div className="skeleton" style={{ height: 18, width: '40%', marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 14, width: '75%' }} />
            </div>
          ))}
        </div>
      )}

      {submissions && submissions.length === 0 && (
        <div className="empty-state">
          <div className="icon">📦</div>
          <h2 style={{ textTransform: 'none', letterSpacing: 0 }}>No submissions yet</h2>
          <p style={{ marginTop: 6, marginBottom: 20 }}>
            Paste your first snippet and get an AI-powered review in seconds.
          </p>
          <Link to="/submit"><button className="btn btn-primary">Submit your first code</button></Link>
        </div>
      )}

      {submissions && submissions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {submissions.map((sub, i) => {
            const review = sub.reviews[0]
            const lang = languageMeta(sub.language)
            const failed = review?.aiFeedback?.startsWith('⚠️')
            return (
              <Link
                key={sub.id}
                to={`/submissions/${sub.id}`}
                className="card card-link anim-rise"
                style={{ padding: '16px 18px', '--d': `${Math.min(i, 8) * 70}ms` } as React.CSSProperties}
              >
                <div className="spread">
                  <div className="row">
                    <span className="mono muted" style={{ fontSize: 13 }}>#{String(sub.id).padStart(3, '0')}</span>
                    <span className="badge badge-gray">
                      <span className="dot" style={{ background: lang.color }} />
                      {lang.label}
                    </span>
                    {review && !failed && (
                      <span className={scoreBadgeClass(review.score)}>Score {review.score}</span>
                    )}
                    {failed && <span className="badge badge-red">Review failed</span>}
                    {!review && (
                      <span className="badge badge-blue"><span className="pulse-dot" /> Reviewing…</span>
                    )}
                  </div>
                  <span className="faint" style={{ fontSize: 13 }}>{timeAgo(sub.createdAt)}</span>
                </div>
                <pre
                  className="mono muted"
                  style={{
                    marginTop: 10,
                    fontSize: 12.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.6,
                  }}
                >
                  {sub.code.split('\n')[0].slice(0, 120)}
                </pre>
                {review && !failed && review.passRate !== null && (
                  <div className="row" style={{ marginTop: 8 }}>
                    <div style={{ flex: 1, maxWidth: 220, height: 4, background: 'var(--border-light)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.round(review.passRate * 100)}%`, height: '100%', background: review.passRate >= 0.7 ? 'var(--success)' : 'var(--danger)', borderRadius: 2 }} />
                    </div>
                    <span className="faint" style={{ fontSize: 12 }}>
                      {Math.round(review.passRate * 100)}% tests passed
                    </span>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
