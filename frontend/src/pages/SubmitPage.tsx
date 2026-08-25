import { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useToast } from '../context/ToastContext'

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
]

const STARTERS: Record<string, string> = {
  javascript: '// Paste or write code, then press Cmd+Enter\nfunction divide(a, b) {\n  return a / b;\n}\n',
  typescript: '// Paste or write code, then press Cmd+Enter\nfunction divide(a: number, b: number): number {\n  return a / b;\n}\n',
  python: '# Paste or write code, then press Cmd+Enter\ndef divide(a, b):\n    return a / b\n',
}

const CRITERIA = [
  ['🐛', 'Bugs & logic errors'],
  ['🎨', 'Style & conventions'],
  ['📊', 'Complexity rating'],
  ['🔐', 'Security concerns'],
  ['🧪', 'AI-generated test cases'],
  ['🔥', 'Hinglish roast verdict'],
]

export default function SubmitPage() {
  const [mode, setMode] = useState<'paste' | 'url'>('paste')
  const [code, setCode] = useState(STARTERS['javascript'])
  const [language, setLanguage] = useState('javascript')
  const [githubUrl, setGithubUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    setCode((prev) =>
      Object.values(STARTERS).includes(prev) ? STARTERS[language] ?? prev : prev
    )
  }, [language])

  const handleSubmit = async () => {
    if (!code.trim() || submitting) {
      if (!code.trim()) toast('Write some code first!', 'error')
      return
    }
    setSubmitting(true)
    try {
      const res = await api.post('/submissions', { code, language })
      api.post('/reviews/generate', { submissionId: res.data.id }).catch(() => {})
      navigate(`/submissions/${res.data.id}`)
    } catch (err) {
      toast('Failed to submit code. Is the backend running?', 'error')
      setSubmitting(false)
    }
  }

  const handleGithubSubmit = async () => {
    if (!githubUrl.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await api.post('/submissions/from-url', { url: githubUrl })
      toast(`Fetched: ${res.data.title}`, 'success')
      navigate(`/submissions/${res.data.id}`)
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to fetch from GitHub', 'error')
      setSubmitting(false)
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        mode === 'paste' ? handleSubmit() : handleGithubSubmit()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const lineCount = code.split('\n').length

  return (
    <div className="page" style={{ maxWidth: 1200 }}>
      <div className="page-header">
        <div>
          <span className="eyebrow">New submission</span>
          <h1>
            Review <span className="serif-accent" style={{ color: 'var(--accent)' }}>any code</span> in seconds
          </h1>
          <p className="muted" style={{ marginTop: 6, fontSize: 14.5 }}>
            Paste a snippet or drop a GitHub link — get bugs, style, security, and AI-generated benchmark tests
          </p>
        </div>
        {mode === 'paste' && (
          <div className="row">
            <select
              className="select"
              style={{ width: 150 }}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
            <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary" style={{ padding: '8px 18px' }}>
              {submitting ? (
                <>
                  <span className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
                  Submitting…
                </>
              ) : (
                <>Review code <span className="kbd">⌘⏎</span></>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Segmented control */}
      <div className="segmented">
        <div
          className="seg-indicator"
          style={{ transform: mode === 'paste' ? 'translateX(0)' : 'translateX(calc(100% + 4px))' }}
        />
        <button className={`seg-btn ${mode === 'paste' ? 'active' : ''}`} onClick={() => setMode('paste')}>
          📋 Paste code
        </button>
        <button className={`seg-btn ${mode === 'url' ? 'active' : ''}`} onClick={() => setMode('url')}>
          🐙 GitHub link
        </button>
      </div>

      {mode === 'url' ? (
        <div className="card anim-rise" style={{ padding: 24, maxWidth: 720 }}>
          <h3>From GitHub</h3>
          <p className="muted" style={{ margin: '8px 0 14px', fontSize: 13 }}>
            Works with pull requests, file links, and gists on public repos:
          </p>
          <ul className="mono muted" style={{ margin: '0 0 18px 18px', fontSize: 12, lineHeight: 2 }}>
            <li>github.com/<b>owner/repo</b>/pull/42</li>
            <li>github.com/<b>owner/repo</b>/blob/main/src/app.js</li>
            <li>gist.github.com/<b>user</b>/abc123…</li>
          </ul>
          <div className="row">
            <input
              className="input mono"
              placeholder="https://github.com/expressjs/express/pull/..."
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              autoFocus
            />
            <button onClick={handleGithubSubmit} disabled={submitting || !githubUrl.trim()} className="btn btn-primary" style={{ padding: '8px 18px', flexShrink: 0 }}>
              {submitting ? (
                <>
                  <span className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
                  Fetching…
                </>
              ) : (
                <>Fetch & review</>
              )}
            </button>
          </div>
          <p className="faint" style={{ marginTop: 14, fontSize: 12 }}>
            For PRs, the changed-lines diff is reviewed. Private repos need a GITHUB_TOKEN in backend/.env.
          </p>
        </div>
      ) : (
      <div className="anim-rise" style={{ '--d': '80ms' } as React.CSSProperties}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20, alignItems: 'start' }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div
            className="spread"
            style={{
              padding: '8px 14px',
              borderBottom: '1px solid var(--border-light)',
              background: 'var(--bg-inset)',
              fontSize: 12,
              color: 'var(--text-muted)',
            }}
          >
            <span className="mono">snippet.{language === 'typescript' ? 'ts' : language === 'python' ? 'py' : language === 'java' ? 'java' : language === 'go' ? 'go' : language === 'rust' ? 'rs' : 'js'}</span>
            <span>{lineCount} lines · {code.length} chars</span>
          </div>
          <Editor
            height="520px"
            language={language}
            value={code}
            onChange={(value) => setCode(value || '')}
            theme="vs"
            options={{
              fontSize: 13.5,
              fontFamily: "'SF Mono', 'Cascadia Code', Consolas, monospace",
              minimap: { enabled: false },
              padding: { top: 14 },
              scrollBeyondLastLine: false,
              renderLineHighlight: 'none',
              smoothScrolling: true,
              cursorBlinking: 'smooth',
            }}
            loading={<div style={{ display: 'grid', placeItems: 'center', height: '100%' }}><span className="spinner" /></div>}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 16 }}>
            <h3>What you'll get</h3>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {CRITERIA.map(([icon, label]) => (
                <div key={label} className="row" style={{ fontSize: 13.5 }}>
                  <span>{icon}</span>
                  <span className="muted">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <h3>Tips</h3>
            <ul className="muted" style={{ margin: '10px 0 0 18px', fontSize: 13, lineHeight: 1.8 }}>
              <li>Include a single focused function</li>
              <li>Buggy code gets more interesting reviews</li>
              <li><span className="kbd">⌘</span> + <span className="kbd">⏎</span> submits from anywhere</li>
            </ul>
          </div>
        </div>
      </div>
      </div>
      )}
    </div>
  )
}