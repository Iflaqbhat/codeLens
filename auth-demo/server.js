const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const SECRET = 'secretkey';

app.use(express.json());
app.use(cors());

const users = [];

app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'All fields are required' });
  if (users.find(u => u.email === email)) return res.status(409).json({ message: 'User already exists' });
  const user = { name, email, password: await bcrypt.hash(password, 10), todos: [] };
  users.push(user);
  const token = jwt.sign({ email }, SECRET, { expiresIn: '1h' });
  res.status(201).json({ message: 'User created', token });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = jwt.sign({ email }, SECRET, { expiresIn: '1h' });
  res.json({ message: 'Login success', token });
});

function auth(req, res, next) {
  const token = (req.headers.authorization || '').split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

app.get('/todos', auth, (req, res) => {
  const user = users.find(u => u.email === req.user.email);
  res.json(user.todos);
});

app.post('/todos', auth, (req, res) => {
  const user = users.find(u => u.email === req.user.email);
  user.todos.push({ title: req.body.title, description: req.body.description });
  res.status(201).json({ message: 'Todo added' });
});

app.listen(3000, () => console.log('Server on port 3000'));