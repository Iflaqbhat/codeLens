import { useState, useEffect } from 'react';

const styles = {
  page: { background: '#0f172a', color: '#e2e8f0', minHeight: '100vh', display: 'flex', justifyContent: 'center', padding: '2rem' },
  card: { background: '#1e293b', padding: '2rem', borderRadius: 12, width: 400 },
  input: { width: '100%', padding: '.6rem', marginBottom: '.5rem', borderRadius: 6, border: 'none', boxSizing: 'border-box', background: '#0f172a', color: '#e2e8f0' },
  button: { width: '100%', padding: '.6rem', borderRadius: 6, border: 'none', background: '#6366f1', color: 'white', fontWeight: 600, cursor: 'pointer' },
  log: { marginTop: '1rem', fontFamily: 'monospace', fontSize: '.75rem', color: '#a5f3fc', whiteSpace: 'pre-wrap' },
  h2: { fontSize: '1rem', color: '#94a3b8' }
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [todos, setTodos] = useState([]);
  const [log, setLog] = useState('Ready.');

  const form = { name: '', email: '', password: '', title: '', description: '' };

  async function req(path, method, body) {
    const res = await fetch(path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => null);
    setLog(`Status: ${res.status}\n${JSON.stringify(data)}`);

    if (res.status === 401 && token) {
      localStorage.removeItem('token');
      setToken('');
      setTodos([]);
      setLog('Status: 401 — token expired or invalid. Please log in again.');
    }

    return { res, data };
  }

  async function signup() {
    const { data } = await req('/signup', 'POST', { name: form.name, email: form.email, password: form.password });
    if (data?.token) setToken(data.token);
  }

  async function login() {
    const { data } = await req('/login', 'POST', { email: form.email, password: form.password });
    if (data?.token) setToken(data.token);
  }

  async function loadTodos() {
    const { res, data } = await req('/todos', 'GET');
    if (res.ok) setTodos(Array.isArray(data) ? data : []);
  }

  async function addTodo() {
    await req('/todos', 'POST', { title: form.title, description: form.description });
    loadTodos();
  }

  function logout() {
    localStorage.removeItem('token');
    setToken('');
    setTodos([]);
    setLog('Logged out');
  }

  useEffect(() => {
    localStorage.setItem('token', token);
    if (token) loadTodos();
  }, [token]);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1>Auth Client (React)</h1>

        {!token ? (
          <>
            <h2 style={styles.h2}>Signup</h2>
            <input style={styles.input} placeholder="name" onChange={e => (form.name = e.target.value)} />
            <input style={styles.input} placeholder="email" onChange={e => (form.email = e.target.value)} />
            <input style={styles.input} type="password" placeholder="password" onChange={e => (form.password = e.target.value)} />
            <button style={styles.button} onClick={signup}>Sign up</button>

            <h2 style={styles.h2}>Login</h2>
            <input style={styles.input} placeholder="email" onChange={e => (form.email = e.target.value)} />
            <input style={styles.input} type="password" placeholder="password" onChange={e => (form.password = e.target.value)} />
            <button style={styles.button} onClick={login}>Log in</button>
          </>
        ) : (
          <>
            <input style={styles.input} placeholder="title" onChange={e => (form.title = e.target.value)} />
            <input style={styles.input} placeholder="description" onChange={e => (form.description = e.target.value)} />
            <button style={styles.button} onClick={addTodo}>Add todo</button>
            <ul>
              {todos.map((t, i) => (
                <li key={i}>{t.title} — {t.description}</li>
              ))}
            </ul>
            <button style={{ ...styles.button, background: '#b91c1c', marginTop: '.5rem' }} onClick={logout}>Logout</button>
          </>
        )}

        <div style={styles.log}>{log}</div>
      </div>
    </div>
  );
}

export default App;