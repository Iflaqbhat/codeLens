import { useEffect, useState } from 'react';

export default function Dashboard({ token, username, onLogout, API }) {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getTodos();
  }, []);

  async function getTodos() {
    const res = await fetch(`${API}/todos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setTodos(Array.isArray(data) ? data : []);
  }

  async function addTodo(e) {
    e.preventDefault();
    setError('');
    if (!title) return;

    const res = await fetch(`${API}/todos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, description }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.errors?.[0]?.message || data.message);
      return;
    }
    setTodos(data.todos);
    setTitle('');
    setDescription('');
  }

  async function toggleTodo(id) {
    const res = await fetch(`${API}/todos/${id}/toggle`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) setTodos(data.todos);
  }

  async function deleteTodo(id) {
    const res = await fetch(`${API}/todos/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) setTodos(data.todos);
  }

  return (
    <div className="dashboard">
      <header>
        <div>
          <h1>Hello, {username}</h1>
          <p className="subtitle">Your personal todo list, protected by JWT</p>
        </div>
        <button className="link" onClick={onLogout}>
          Log out
        </button>
      </header>

      <form className="add-form" onSubmit={addTodo}>
        <input
          placeholder="What needs doing?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          placeholder="Details (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit">Add</button>
      </form>

      {error && <p className="error">{error}</p>}

      <ul className="todo-list">
        {todos.length === 0 && <p className="empty">No todos yet — add your first one above.</p>}
        {todos.map((todo) => (
          <li key={todo._id} className={todo.done ? 'todo done' : 'todo'}>
            <div>
              <strong>{todo.title}</strong>
              {todo.description && <span className="desc">{todo.description}</span>}
            </div>
            <div className="actions">
              <button onClick={() => toggleTodo(todo._id)}>
                {todo.done ? 'Undo' : 'Done'}
              </button>
              <button className="danger" onClick={() => deleteTodo(todo._id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}