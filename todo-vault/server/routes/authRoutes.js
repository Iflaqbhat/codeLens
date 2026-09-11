const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { signupSchema, loginSchema } = require('../validation/schemas');

const router = express.Router();

router.post('/signup', async (req, res) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(411).json({ message: 'Invalid input', errors: parsed.error.issues });
    }
    const { username, email, password } = parsed.data;

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashed });
    const token = jwt.sign({ email, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ message: 'User created', token, username: user.username });
  } catch (err) {
    res.status(500).json({ message: 'Error creating user' });
  }
});

router.post('/login', async (req, res) => {
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

    const token = jwt.sign({ email, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Login success', token, username: user.username });
  } catch (err) {
    res.status(500).json({ message: 'Error logging in' });
  }
});

module.exports = router;