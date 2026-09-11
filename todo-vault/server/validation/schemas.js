const { z } = require('zod');

const signupSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email:    z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const todoSchema = z.object({
  title:       z.string().min(1, 'Title is required'),
  description: z.string().optional(),
});

module.exports = { signupSchema, loginSchema, todoSchema };