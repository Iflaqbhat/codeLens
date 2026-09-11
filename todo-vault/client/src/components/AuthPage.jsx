import { useState } from 'react';

export default function AuthPage({ API, onAuth }) {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const body = isSignup ? { username, email, password } : { email, password };
    const res = await fetch(`${API}/auth/${isSignup ? 'signup' : 'login'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    setLoading(false);
    if (!res.ok) {
      setError(data.errors?.[0]?.message || data.message || 'Something went wrong');
      return;
    }
    onAuth({ token: data.token, username: data.username });
  }

  return (
    <div className="auth-card">
      <h1>TodoVault</h1>
      <p className="subtitle">Sign up or log in to save your todos securely.</p>

      <form onSubmit={submit}>
        {isSignup && (
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Please wait...' : isSignup ? 'Sign up' : 'Log in'}
        </button>
      </form>

      <button className="link" onClick={() => setIsSignup(!isSignup)}>
        {isSignup ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
      </button>
    </div>
  );
}