import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { timeAgo, scoreColor, scoreBadgeClass, languageMeta } from '../lib/format'
import { useCountUp } from '../lib/useCountUp'
import TiltCard from '../components/TiltCard'

interface Submission {
  id: number
  code: string
  language: string
  createdAt: string
  reviews: { score: number; passRate: number | null; aiFeedback: string }[]
}

export default function DashboardPage() {
  const [submissions, setSubmissions] = useState<Submission[] | null>(null)

  useEffect(() => {
    api.get('/submissions')
      .then((res) => setSubmissions(res.data))
      .catch(() => setSubmissions([]))
  }, [])

  if (!submissions) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 32, width: 200, marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 96 }} />)}
        </div>
        <div className="skeleton" style={{ height: 180, marginTop: 20 }} />
      </div>
    )
  }

  const reviewed = submissions.filter((s) => s.reviews.length > 0 && !s.reviews[0].aiFeedback?.startsWith('⚠️'))
  const withTests = reviewed.filter((s) => s.reviews[0].passRate !== null)
  const avgScore = reviewed.length ? Math.round(reviewed.reduce((sum, s) => sum + s.reviews[0].score, 0) / reviewed.length) : null
  const bestScore = reviewed.length ? Math.max(...reviewed.map((s) => s.reviews[0].score)) : null
  const avgPassRate = withTests.length ? Math.round(withTests.reduce((sum, s) => sum + (s.reviews[0].passRate || 0), 0) / withTests.length * 100) : null

  // Chronological for chart (oldest → newest)
  const chartData = [...reviewed].reverse()

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="eyebrow">Analytics</span>
          <h1>
            Your progress, <span className="serif-accent" style={{ color: 'var(--accent)' }}>measured</span>
          </h1>
          <p className="muted" style={{ marginTop: 6, fontSize: 14.5 }}>Scores, trends, and benchmarks over time</p>
        </div>
        <Link to="/submit"><button className="btn btn-primary">+ New review</button></Link>
      </div>

      {submissions.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📊</div>
          <h2 style={{ textTransform: 'none' }}>Nothing to analyze yet</h2>
          <p style={{ marginTop: 6, marginBottom: 20 }}>Submit code and your scores will chart here.</p>
          <Link to="/submit"><button className="btn btn-primary">Get started</button></Link>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            <StatCard icon="📦" label="Submissions" value={submissions.length} sub={`${reviewed.length} reviewed`} delay={0} />
            <StatCard
              icon="🎯"
              label="Avg Score"
              value={avgScore !== null ? avgScore : '—'}
              valueColor={avgScore !== null ? scoreColor(avgScore) : undefined}
              sub={bestScore !== null ? `best ${bestScore}` : 'no reviews yet'}
              delay={70}
            />
            <StatCard
              icon="🧪"
              label="Test Pass Rate"
              value={avgPassRate !== null ? `${avgPassRate}%` : '—'}
              valueColor={avgPassRate !== null ? (avgPassRate >= 70 ? 'var(--success)' : 'var(--danger)') : undefined}
              sub={withTests.length ? `across ${withTests.length} runs` : 'sandbox not run'}
              delay={140}
            />
            <StatCard
              icon="📈"
              label="Trend"
              value={trendLabel(reviewed.map((s) => s.reviews[0].score))}
              sub="last two submissions"
              delay={210}
            />
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="card" style={{ padding: 20, marginTop: 16 }}>
              <div className="spread" style={{ marginBottom: 16 }}>
                <h3>Score history</h3>
                <span className="faint" style={{ fontSize: 12 }}>oldest → newest</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 140 }}>
                {chartData.map((s, i) => {
                  const score = s.reviews[0].score
                  return (
                    <Link
                      key={s.id}
                      to={`/submissions/${s.id}`}
                      title={`#${s.id} — score ${score}`}
                      style={{
                        flex: 1,
                        maxWidth: 64,
                        textAlign: 'center',
                        textDecoration: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        height: '100%',
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, color: scoreColor(score), marginBottom: 6 }}>
                        {score}
                      </div>
                      <div
                        className="bar-grow"
                        style={{
                          '--d': `${i * 90}ms`,
                          height: `${Math.max(score, 3)}%`,
                          background: `linear-gradient(180deg, ${scoreColor(score)}, ${scoreColor(score)}44)`,
                          borderRadius: '4px 4px 2px 2px',
                          transition: 'opacity 0.15s',
                          opacity: 0.85,
                        } as React.CSSProperties}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.85')}
                      />
                      <div className="faint mono" style={{ fontSize: 10.5, marginTop: 6 }}>#{s.id}</div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent table */}
          <div className="card" style={{ marginTop: 16, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-light)' }}>
              <h3>All submissions</h3>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Language</th>
                  <th>Score</th>
                  <th>Tests</th>
                  <th>When</th>
                  <th>Preview</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => {
                  const review = s.reviews[0]
                  const failed = review?.aiFeedback?.startsWith('⚠️')
                  const lang = languageMeta(s.language)
                  return (
                    <tr key={s.id}>
                      <td>
                        <Link to={`/submissions/${s.id}`} className="mono" style={{ fontSize: 13 }}>
                          #{String(s.id).padStart(3, '0')}
                        </Link>
                      </td>
                      <td>
                        <span className="badge badge-gray">
                          <span className="dot" style={{ background: lang.color }} />
                          {lang.label}
                        </span>
                      </td>
                      <td>
                        {!review ? (
                          <span className="badge badge-blue"><span className="pulse-dot" /></span>
                        ) : failed ? (
                          <span className="badge badge-red">failed</span>
                        ) : (
                          <span className={scoreBadgeClass(review.score)}>{review.score}</span>
                        )}
                      </td>
                      <td className="muted">
                        {review && !failed && review.passRate !== null
                          ? `${Math.round(review.passRate * 100)}%`
                          : '—'}
                      </td>
                      <td className="faint" style={{ fontSize: 13 }}>{timeAgo(s.createdAt)}</td>
                      <td>
                        <pre className="mono muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260, fontSize: 12.5 }}>
                          {s.code.split('\n')[0]}
                        </pre>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function trendLabel(scores: number[]): string {
  if (scores.length < 2) return '—'
  const delta = scores[scores.length - 1] - scores[scores.length - 2]
  if (delta === 0) return '='
  return delta > 0 ? `+${delta}` : `${delta}`
}

function StatCard({ icon, label, value, sub, valueColor, delay = 0 }: {
  icon: string
  label: string
  value: string | number
  sub?: string
  valueColor?: string
  delay?: number
}) {
  const animated = useCountUp(typeof value === 'number' ? value : 0)
  const display = typeof value === 'number' ? animated : value

  return (
    <div className="anim-rise" style={{ '--d': `${delay}ms` } as React.CSSProperties}>
      <TiltCard className="stat-card" max={7}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="stat-label">{label}</span>
          <span style={{ fontSize: 15 }}>{icon}</span>
        </div>
        <div className="stat-value" style={valueColor ? { color: valueColor } : undefined}>{display}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </TiltCard>
    </div>
  )
}
