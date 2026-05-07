const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb, ObjectId } = require('../db/database');
const { authenticate, requireProjectAccess, requireProjectAdmin } = require('../middleware/auth');

const router = express.Router();
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function serializeProject(project) {
  if (!project) return null;
  const { _id, owner_id, ...rest } = project;
  return {
    ...rest,
    id: _id.toString(),
    owner_id: owner_id?.toString ? owner_id.toString() : owner_id,
  };
}

function serializeMember(member) {
  if (!member) return null;
  return {
    id: member.id ? member.id.toString() : member._id.toString(),
    name: member.name,
    email: member.email,
    global_role: member.global_role,
    avatar_color: member.avatar_color,
    project_role: member.project_role,
    joined_at: member.joined_at,
  };
}

// GET /api/projects
router.get('/', authenticate, wrap(async (req, res) => {
  const db = getDb();
  const userId = new ObjectId(req.user.id);

  const projects = await db.collection('projects').aggregate([
    {
      $lookup: {
        from: 'project_members',
        localField: '_id',
        foreignField: 'project_id',
        as: 'members',
      },
    },
    { $match: { 'members.user_id': userId } },
    {
      $lookup: {
        from: 'users',
        localField: 'owner_id',
        foreignField: '_id',
        as: 'owner',
      },
    },
    { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'tasks',
        localField: '_id',
        foreignField: 'project_id',
        as: 'tasks',
      },
    },
    {
      $addFields: {
        owner_name: '$owner.name',
        member_count: { $size: '$members' },
        task_count: { $size: '$tasks' },
        done_count: {
          $size: {
            $filter: {
              input: '$tasks',
              as: 'task',
              cond: { $eq: ['$$task.status', 'done'] },
            },
          },
        },
      },
    },
    { $project: { members: 0, tasks: 0, owner: 0 } },
    { $sort: { created_at: -1 } },
  ]).toArray();

  res.json({ projects: projects.map(serializeProject) });
}));

// POST /api/projects
router.post('/', authenticate, [
  body('name').trim().notEmpty().withMessage('Name required'),
], wrap(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description, color } = req.body;
  const db = getDb();
  const ownerId = new ObjectId(req.user.id);

  const result = await db.collection('projects').insertOne({
    name,
    description: description || '',
    color: color || '#6366f1',
    owner_id: ownerId,
    created_at: new Date(),
  });

  await db.collection('project_members').insertOne({
    project_id: result.insertedId,
    user_id: ownerId,
    role: 'admin',
    joined_at: new Date(),
  });

  const project = await db.collection('projects').findOne({ _id: result.insertedId });
  res.status(201).json({ project: serializeProject(project) });
}));

// GET /api/projects/:projectId
router.get('/:projectId', authenticate, requireProjectAccess, wrap(async (req, res) => {
  if (!ObjectId.isValid(req.params.projectId)) {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  const db = getDb();
  const projectId = new ObjectId(req.params.projectId);
  const project = await db.collection('projects').findOne({ _id: projectId });
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const owner = await db.collection('users').findOne(
    { _id: project.owner_id },
    { projection: { name: 1 } }
  );

  const members = await db.collection('project_members').aggregate([
    { $match: { project_id: projectId } },
    {
      $lookup: {
        from: 'users',
        localField: 'user_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        id: '$user._id',
        name: '$user.name',
        email: '$user.email',
        global_role: '$user.role',
        avatar_color: '$user.avatar_color',
        project_role: '$role',
        joined_at: '$joined_at',
      },
    },
  ]).toArray();

  res.json({
    project: {
      ...serializeProject(project),
      owner_name: owner?.name || '',
      members: members.map(m => ({ ...m, id: m.id.toString() })),
      userRole: req.projectRole,
    },
  });
}));

// PUT /api/projects/:projectId
router.put('/:projectId', authenticate, requireProjectAccess, requireProjectAdmin, [
  body('name').trim().notEmpty(),
], wrap(async (req, res) => {
  if (!ObjectId.isValid(req.params.projectId)) {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description, color } = req.body;
  const db = getDb();
  const projectId = new ObjectId(req.params.projectId);

  await db.collection('projects').updateOne(
    { _id: projectId },
    { $set: { name, description: description || '', color: color || '#6366f1' } }
  );

  const project = await db.collection('projects').findOne({ _id: projectId });
  res.json({ project: serializeProject(project) });
}));

// DELETE /api/projects/:projectId
router.delete('/:projectId', authenticate, requireProjectAccess, requireProjectAdmin, wrap(async (req, res) => {
  if (!ObjectId.isValid(req.params.projectId)) {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  const db = getDb();
  const projectId = new ObjectId(req.params.projectId);

  const taskIds = await db.collection('tasks').find({ project_id: projectId }, { projection: { _id: 1 } }).toArray();
  const taskObjectIds = taskIds.map((task) => task._id);

  await Promise.all([
    db.collection('projects').deleteOne({ _id: projectId }),
    db.collection('project_members').deleteMany({ project_id: projectId }),
    db.collection('tasks').deleteMany({ project_id: projectId }),
    taskObjectIds.length ? db.collection('comments').deleteMany({ task_id: { $in: taskObjectIds } }) : Promise.resolve(),
  ]);

  res.json({ message: 'Project deleted' });
}));

// POST /api/projects/:projectId/members
router.post('/:projectId/members', authenticate, requireProjectAccess, requireProjectAdmin, wrap(async (req, res) => {
  if (!ObjectId.isValid(req.params.projectId)) {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  const { user_id, role } = req.body;
  if (!user_id || !ObjectId.isValid(user_id)) {
    return res.status(400).json({ error: 'Valid user_id is required' });
  }

  const db = getDb();
  const projectId = new ObjectId(req.params.projectId);
  const userId = new ObjectId(user_id);

  const user = await db.collection('users').findOne({ _id: userId });
  if (!user) return res.status(404).json({ error: 'User not found' });

  try {
    await db.collection('project_members').insertOne({
      project_id: projectId,
      user_id: userId,
      role: role || 'member',
      joined_at: new Date(),
    });
    res.status(201).json({ message: 'Member added' });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'User already a member' });
    throw err;
  }
}));

// DELETE /api/projects/:projectId/members/:userId
router.delete('/:projectId/members/:userId', authenticate, requireProjectAccess, requireProjectAdmin, wrap(async (req, res) => {
  if (!ObjectId.isValid(req.params.projectId) || !ObjectId.isValid(req.params.userId)) {
    return res.status(400).json({ error: 'Invalid project or user ID' });
  }

  const db = getDb();
  await db.collection('project_members').deleteOne({
    project_id: new ObjectId(req.params.projectId),
    user_id: new ObjectId(req.params.userId),
  });

  res.json({ message: 'Member removed' });
}));

module.exports = router;
