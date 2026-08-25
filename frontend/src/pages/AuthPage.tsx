import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function AuthPage() {
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { login, signup } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (isSignup) {
        await signup(email, password, name)
        toast('Welcome! Account created.', 'success')
      } else {
        await login(email, password)
        toast('Welcome back!', 'success')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card anim-rise">
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span className="brand-glyph float-soft" style={{ width: 46, height: 46, borderRadius: 13, fontSize: 18, margin: '0 auto 18px' }}>
            &lt;/&gt;
          </span>
          <h1 style={{ fontSize: 26 }}>
            <span className="gradient-text">{isSignup ? 'Start reviewing' : 'Welcome back to'}</span>{' '}
            <span className="serif-accent" style={{ color: 'var(--accent)' }}>better code</span>
          </h1>
          <p className="muted" style={{ marginTop: 8, fontSize: 14 }}>
            AI review, quality scores & generated benchmarks
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <>
              <label className="field-label">Name</label>
              <input
                className="input"
                type="text"
                placeholder="Ada Lovelace"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </>
          )}
          <label className="field-label">Email</label>
          <input
            className="input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <label className="field-label">Password</label>
          <input
            className="input"
            type="password"
            placeholder={isSignup ? 'At least 6 characters' : '••••••••'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />

          {error && (
            <div
              style={{
                marginTop: 14,
                padding: '10px 12px',
                background: 'var(--danger-soft)',
                border: '1px solid rgba(248,81,73,0.4)',
                borderRadius: 6,
                color: 'var(--danger)',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%', justifyContent: 'center', padding: '10px', marginTop: 20, fontSize: 14 }}>
            {busy && <span className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />}
            {busy ? (isSignup ? 'Creating account…' : 'Signing in…') : isSignup ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="faint" style={{ textAlign: 'center', marginTop: 18, fontSize: 13 }}>
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); setIsSignup(!isSignup); setError('') }} style={{ fontWeight: 500 }}>
            {isSignup ? 'Sign in' : 'Sign up free'}
          </a>
        </p>
      </div>
    </div>
  )
}
