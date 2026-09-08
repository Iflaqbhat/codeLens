const express = require('express');
const fs = require('fs');

const app = express();
const PORT = 3000;
const FILE = 'todos.json';

app.use(express.json());

function readTodos() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf-8'));
  } catch (err) {
    return [];
  }
}

function writeTodos(todos) {
  fs.writeFileSync(FILE, JSON.stringify(todos, null, 2));
}

app.get('/todos', (req, res) => {
  res.json(readTodos());
});

app.get('/todos/:id', (req, res) => {
  const todos = readTodos();
  const todo = todos.find(t => t.id === Number(req.params.id));
  if (!todo) {
    return res.status(404).json({ msg: 'Todo not found' });
  }
  res.json(todo);
});

app.post('/todos', (req, res) => {
  const todos = readTodos();
  const id = todos.length ? todos[todos.length - 1].id + 1 : 1;
  const todo = { id, title: req.body.title, done: false };
  todos.push(todo);
  writeTodos(todos);
  res.status(201).json(todo);
});

app.put('/todos/:id', (req, res) => {
  const todos = readTodos();
  const index = todos.findIndex(t => t.id === Number(req.params.id));
  if (index === -1) {
    return res.status(404).json({ msg: 'Todo not found' });
  }
  todos[index] = { ...todos[index], ...req.body, id: todos[index].id };
  writeTodos(todos);
  res.json(todos[index]);
});

app.delete('/todos/:id', (req, res) => {
  const todos = readTodos();
  const index = todos.findIndex(t => t.id === Number(req.params.id));
  if (index === -1) {
    return res.status(404).json({ msg: 'Todo not found' });
  }
  const deleted = todos.splice(index, 1);
  writeTodos(todos);
  res.json(deleted[0]);
});

app.listen(PORT, () => {
  console.log(`File todo app running on http://localhost:${PORT}`);
});