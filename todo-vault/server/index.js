require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const todoRoutes = require('./routes/todoRoutes');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

app.use('/auth', authRoutes);
app.use('/todos', todoRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'TodoVault API is running' });
});

mongoose.connect(process.env.MONGO_URL)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });