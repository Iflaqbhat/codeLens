import { useState } from "react";

const API = "http://localhost:3000";

function App() {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [todos, setTodos] = useState([]);

  async function signup() {
    const res = await fetch(`${API}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    setToken(data.token);
  }

  async function login() {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setToken(data.token);
  }

  async function getTodos() {
    const res = await fetch(`${API}/todos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    console.log(data);
    setTodos(Array.isArray(data) ? data : []);
  }

  function logout() {
    setToken("");
    setTodos([]);
  }

  return (
    <div>
      <h1>Todo App</h1>

      {!token ? (
        <>
          <h2>{isSignup ? "Signup" : "Login"}</h2>

          {isSignup && (
            <input placeholder="Name" onChange={(e) => setName(e.target.value)} />
          )}

          <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
          <input
            type="password"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
          />

          <br />
          <br />

          <button onClick={isSignup ? signup : login}>
            {isSignup ? "Signup" : "Login"}
          </button>
          <button onClick={() => setIsSignup(!isSignup)}>
            {isSignup
              ? "Already have an account? Login"
              : "Don't have an account? Signup"}
          </button>
        </>
      ) : (
        <>
          <h2>Logged in</h2>

          <button onClick={getTodos}>Get Todos</button>
          <ul>
            {todos.map((t, i) => (
              <li key={i}>{t.title} — {t.description}</li>
            ))}
          </ul>

          <button onClick={logout}>Logout</button>
        </>
      )}
    </div>
  );
}

export default App;