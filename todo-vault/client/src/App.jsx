import { useState } from 'react';
import AuthPage from './components/AuthPage.jsx';
import Dashboard from './components/Dashboard.jsx';

const API = 'http://localhost:3000';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');

  function handleAuth({ token, username }) {
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
    setToken(token);
    setUsername(username);
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken('');
    setUsername('');
  }

  return token ? (
    <Dashboard
      token={token}
      username={username}
      onLogout={handleLogout}
      API={API}
    />
  ) : (
    <AuthPage API={API} onAuth={handleAuth} />
  );
}