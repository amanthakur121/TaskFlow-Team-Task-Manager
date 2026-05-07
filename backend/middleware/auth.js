const jwt = require('jsonwebtoken');
const { getDb, ObjectId } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow-secret-key-change-in-production';

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload.userId || !ObjectId.isValid(payload.userId)) {
      throw new Error('Invalid token payload');
    }

    const db = getDb();
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(payload.userId) },
      { projection: { password: 0 } }
    );

    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = { ...user, id: user._id.toString() };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

async function requireProjectAccess(req, res, next) {
  const projectId = req.params.projectId || req.body.project_id;
  if (!projectId) return next();
  if (!ObjectId.isValid(projectId)) {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  const db = getDb();
  const membership = await db.collection('project_members').findOne({
    project_id: new ObjectId(projectId),
    user_id: new ObjectId(req.user.id),
  });

  if (!membership) {
    return res.status(403).json({ error: 'Not a member of this project' });
  }

  req.projectRole = membership.role;
  next();
}

function requireProjectAdmin(req, res, next) {
  if (req.user.role !== 'admin' && req.projectRole !== 'admin') {
    return res.status(403).json({ error: 'Project admin access required' });
  }
  next();
}

module.exports = { authenticate, requireAdmin, requireProjectAccess, requireProjectAdmin, JWT_SECRET };
