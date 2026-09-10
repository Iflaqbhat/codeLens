require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { z } = require('zod');

const app = express();
const SECRET = process.env.JWT_SECRET;
const MONGO_URL = process.env.MONGO_URL;

app.use(express.json());
app.use(cors());

// ── Mongoose User model ──────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  todos: [{
    title:       { type: String, required: true },
    description: { type: String, default: '' },
    done:        { type: Boolean, default: false },
  }],
});
const User = mongoose.model('User', userSchema);

// ── Zod input validation schemas ──────────────────────────────────────────────
const signupSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email:    z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(20),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

const todoSchema = z.object({
  title:       z.string().min(1, 'Title is required'),
  description: z.string().optional(),
});

// ── Auth middleware ───────────────────────────────────────────────────────────
function auth(req, res, next) {
  const token = (req.headers.authorization || '').split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.post('/signup', async (req, res) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(411).json({ message: 'Invalid input', errors: parsed.error.issues });
    }
    const { username, email, password } = parsed.data;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashed });

    const token = jwt.sign({ email, username: user.username }, SECRET, { expiresIn: '1h' });
    res.status(201).json({ message: 'User created', token });
  } catch (err) {
    res.status(500).json({ message: 'Error creating user' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(411).json({ message: 'Invalid input', errors: parsed.error.issues });
    }
    const { email, password } = parsed.data;

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ email, username: user.username }, SECRET, { expiresIn: '1h' });
    res.json({ message: 'Login success', token });
  } catch (err) {
    res.status(500).json({ message: 'Error logging in' });
  }
});

app.get('/todos', auth, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.todos);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching todos' });
  }
});

app.post('/todos', auth, async (req, res) => {
  try {
    const parsed = todoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(411).json({ message: 'Invalid input', errors: parsed.error.issues });
    }

    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.todos.push(parsed.data);
    await user.save();

    res.status(201).json({ message: 'Todo added' });
  } catch (err) {
    res.status(500).json({ message: 'Error adding todo' });
  }
});

app.post('/logout', auth, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Logged out — client should clear token' });
  } catch (err) {
    res.status(500).json({ message: 'Error logging out' });
  }
});

// ── Connect to Mongo then start server ────────────────────────────────────────
mongoose.connect(MONGO_URL)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(3000, () => console.log('Server on port 3000'));
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
