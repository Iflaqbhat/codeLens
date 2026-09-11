const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const { todoSchema } = require('../validation/schemas');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.todos);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching todos' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const parsed = todoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(411).json({ message: 'Invalid input', errors: parsed.error.issues });
    }

    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.todos.push(parsed.data);
    await user.save();

    res.status(201).json({ message: 'Todo added', todos: user.todos });
  } catch (err) {
    res.status(500).json({ message: 'Error adding todo' });
  }
});

router.put('/:id/toggle', auth, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const todo = user.todos.id(req.params.id);
    if (!todo) return res.status(404).json({ message: 'Todo not found' });

    todo.done = !todo.done;
    await user.save();

    res.json({ message: 'Todo updated', todos: user.todos });
  } catch (err) {
    res.status(500).json({ message: 'Error updating todo' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const todo = user.todos.id(req.params.id);
    if (!todo) return res.status(404).json({ message: 'Todo not found' });

    user.todos.pull(req.params.id);
    await user.save();

    res.json({ message: 'Todo deleted', todos: user.todos });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting todo' });
  }
});

module.exports = router;