const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getDb, ObjectId } = require('../db/database');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function serializeUser(user) {
  if (!user) return null;
  const { _id, password, ...rest } = user;
  return { ...rest, id: _id.toString() };
}

// POST /api/auth/signup
router.post('/signup', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], wrap(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password, role } = req.body;
  const db = getDb();

  const existing = await db.collection('users').findOne({ email });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const hash = bcrypt.hashSync(password, 10);
  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const userRole = role === 'admin' ? 'admin' : 'member';

  const result = await db.collection('users').insertOne({
    name,
    email,
    password: hash,
    role: userRole,
    avatar_color: color,
    created_at: new Date(),
  });

  const user = {
    id: result.insertedId.toString(),
    name,
    email,
    role: userRole,
    avatar_color: color,
  };
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

  res.status(201).json({ token, user });
}));

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], wrap(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  const db = getDb();

  const user = await db.collection('users').findOne({ email });
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });
  const safeUser = serializeUser(user);
  res.json({ token, user: safeUser });
}));

// POST /api/auth/demo
router.post('/demo', wrap(async (req, res) => {
  const db = getDb();
  const user = await db.collection('users').findOne({ email: 'demo@taskflow.app' });
  if (!user) return res.status(404).json({ error: 'Demo account not found' });

  const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: serializeUser(user) });
}));

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// GET /api/auth/users (for assigning tasks)
router.get('/users', authenticate, wrap(async (req, res) => {
  const db = getDb();
  const users = await db.collection('users')
    .find({}, { projection: { password: 0 } })
    .sort({ name: 1 })
    .toArray();
  res.json({ users: users.map(serializeUser) });
}));

module.exports = router;
