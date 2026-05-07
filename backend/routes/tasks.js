const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb, ObjectId } = require('../db/database');
const { authenticate, requireProjectAccess } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function serializeTask(task) {
  if (!task) return null;
  const { _id, project_id, assignee_id, created_by, ...rest } = task;
  return {
    ...rest,
    id: _id.toString(),
    project_id: project_id?.toString?.() || null,
    assignee_id: assignee_id?.toString?.() || null,
    created_by: created_by?.toString?.() || null,
  };
}

function serializeComment(comment) {
  if (!comment) return null;
  const { _id, task_id, user_id, ...rest } = comment;
  return {
    ...rest,
    id: _id.toString(),
    task_id: task_id?.toString?.() || null,
    user_id: user_id?.toString?.() || null,
  };
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function prioritySort(tasks) {
  const rank = { critical: 1, high: 2, medium: 3, low: 4 };
  return tasks.sort((a, b) => {
    const aRank = rank[a.priority] || 3;
    const bRank = rank[b.priority] || 3;
    if (aRank !== bRank) return aRank - bRank;
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

// GET /api/projects/:projectId/tasks
router.get('/', authenticate, requireProjectAccess, wrap(async (req, res) => {
  if (!ObjectId.isValid(req.params.projectId)) {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  const db = getDb();
  const projectId = new ObjectId(req.params.projectId);
  const { status, priority, assignee } = req.query;
  const match = { project_id: projectId };

  if (status) match.status = status;
  if (priority) match.priority = priority;
  if (assignee) {
    if (!ObjectId.isValid(assignee)) {
      return res.status(400).json({ error: 'Invalid assignee ID' });
    }
    match.assignee_id = new ObjectId(assignee);
  }

  const tasks = await db.collection('tasks').aggregate([
    { $match: match },
    {
      $lookup: {
        from: 'users',
        localField: 'assignee_id',
        foreignField: '_id',
        as: 'assignee',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'created_by',
        foreignField: '_id',
        as: 'creator',
      },
    },
    {
      $lookup: {
        from: 'projects',
        localField: 'project_id',
        foreignField: '_id',
        as: 'project',
      },
    },
    { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        assignee_name: { $arrayElemAt: ['$assignee.name', 0] },
        assignee_color: { $arrayElemAt: ['$assignee.avatar_color', 0] },
        creator_name: '$creator.name',
        project_name: '$project.name',
        project_color: '$project.color',
      },
    },
    { $project: { assignee: 0, creator: 0, project: 0 } },
  ]).toArray();

  res.json({ tasks: prioritySort(tasks).map(serializeTask) });
}));

// POST /api/projects/:projectId/tasks
router.post('/', authenticate, requireProjectAccess, [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
], wrap(async (req, res) => {
  if (!ObjectId.isValid(req.params.projectId)) {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, status, priority, assignee_id, due_date } = req.body;
  const db = getDb();
  const projectId = new ObjectId(req.params.projectId);

  const task = {
    title,
    description: description || '',
    status: status || 'todo',
    priority: priority || 'medium',
    project_id: projectId,
    assignee_id: assignee_id && ObjectId.isValid(assignee_id) ? new ObjectId(assignee_id) : null,
    created_by: new ObjectId(req.user.id),
    due_date: parseDate(due_date),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const result = await db.collection('tasks').insertOne(task);
  const createdTask = await db.collection('tasks').aggregate([
    { $match: { _id: result.insertedId } },
    {
      $lookup: {
        from: 'users',
        localField: 'assignee_id',
        foreignField: '_id',
        as: 'assignee',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'created_by',
        foreignField: '_id',
        as: 'creator',
      },
    },
    {
      $lookup: {
        from: 'projects',
        localField: 'project_id',
        foreignField: '_id',
        as: 'project',
      },
    },
    { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        assignee_name: { $arrayElemAt: ['$assignee.name', 0] },
        assignee_color: { $arrayElemAt: ['$assignee.avatar_color', 0] },
        creator_name: '$creator.name',
        project_name: '$project.name',
        project_color: '$project.color',
      },
    },
    { $project: { assignee: 0, creator: 0, project: 0 } },
  ]).next();

  res.status(201).json({ task: serializeTask(createdTask) });
}));

// GET /api/projects/:projectId/tasks/:taskId
router.get('/:taskId', authenticate, requireProjectAccess, wrap(async (req, res) => {
  if (!ObjectId.isValid(req.params.projectId) || !ObjectId.isValid(req.params.taskId)) {
    return res.status(400).json({ error: 'Invalid project or task ID' });
  }

  const db = getDb();
  const projectId = new ObjectId(req.params.projectId);
  const taskId = new ObjectId(req.params.taskId);

  const task = await db.collection('tasks').aggregate([
    { $match: { _id: taskId, project_id: projectId } },
    {
      $lookup: {
        from: 'users',
        localField: 'assignee_id',
        foreignField: '_id',
        as: 'assignee',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'created_by',
        foreignField: '_id',
        as: 'creator',
      },
    },
    {
      $lookup: {
        from: 'projects',
        localField: 'project_id',
        foreignField: '_id',
        as: 'project',
      },
    },
    { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        assignee_name: { $arrayElemAt: ['$assignee.name', 0] },
        assignee_color: { $arrayElemAt: ['$assignee.avatar_color', 0] },
        creator_name: '$creator.name',
        project_name: '$project.name',
        project_color: '$project.color',
      },
    },
    { $project: { assignee: 0, creator: 0, project: 0 } },
  ]).next();

  if (!task) return res.status(404).json({ error: 'Task not found' });

  const comments = await db.collection('comments').aggregate([
    { $match: { task_id: taskId } },
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
        _id: 1,
        task_id: 1,
        user_id: 1,
        content: 1,
        created_at: 1,
        user_name: '$user.name',
        avatar_color: '$user.avatar_color',
      },
    },
  ]).toArray();

  res.json({ task: { ...serializeTask(task), comments: comments.map(serializeComment) } });
}));

// PUT /api/projects/:projectId/tasks/:taskId
router.put('/:taskId', authenticate, requireProjectAccess, wrap(async (req, res) => {
  if (!ObjectId.isValid(req.params.projectId) || !ObjectId.isValid(req.params.taskId)) {
    return res.status(400).json({ error: 'Invalid project or task ID' });
  }

  const db = getDb();
  const projectId = new ObjectId(req.params.projectId);
  const taskId = new ObjectId(req.params.taskId);

  const task = await db.collection('tasks').findOne({ _id: taskId, project_id: projectId });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const isAdmin = req.user.role === 'admin' || req.projectRole === 'admin';
  const isAssignee = task.assignee_id?.toString() === req.user.id;
  const isCreator = task.created_by.toString() === req.user.id;

  if (!isAdmin && !isAssignee && !isCreator) {
    return res.status(403).json({ error: 'Cannot edit this task' });
  }

  const { title, description, status, priority, assignee_id, due_date } = req.body;
  const update = { updated_at: new Date() };

  if ('title' in req.body) update.title = title;
  if ('description' in req.body) update.description = description;
  if ('status' in req.body) update.status = status;
  if ('priority' in req.body) update.priority = priority;
  if ('assignee_id' in req.body) {
    update.assignee_id = assignee_id && ObjectId.isValid(assignee_id) ? new ObjectId(assignee_id) : null;
  }
  if ('due_date' in req.body) {
    update.due_date = parseDate(due_date);
  }

  await db.collection('tasks').updateOne({ _id: taskId, project_id: projectId }, { $set: update });

  const updated = await db.collection('tasks').aggregate([
    { $match: { _id: taskId } },
    {
      $lookup: {
        from: 'users',
        localField: 'assignee_id',
        foreignField: '_id',
        as: 'assignee',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'created_by',
        foreignField: '_id',
        as: 'creator',
      },
    },
    {
      $lookup: {
        from: 'projects',
        localField: 'project_id',
        foreignField: '_id',
        as: 'project',
      },
    },
    { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        assignee_name: { $arrayElemAt: ['$assignee.name', 0] },
        assignee_color: { $arrayElemAt: ['$assignee.avatar_color', 0] },
        creator_name: '$creator.name',
        project_name: '$project.name',
        project_color: '$project.color',
      },
    },
    { $project: { assignee: 0, creator: 0, project: 0 } },
  ]).next();

  res.json({ task: serializeTask(updated) });
}));

// DELETE /api/projects/:projectId/tasks/:taskId
router.delete('/:taskId', authenticate, requireProjectAccess, wrap(async (req, res) => {
  if (!ObjectId.isValid(req.params.projectId) || !ObjectId.isValid(req.params.taskId)) {
    return res.status(400).json({ error: 'Invalid project or task ID' });
  }

  const db = getDb();
  const projectId = new ObjectId(req.params.projectId);
  const taskId = new ObjectId(req.params.taskId);

  const task = await db.collection('tasks').findOne({ _id: taskId, project_id: projectId });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const isAdmin = req.user.role === 'admin' || req.projectRole === 'admin';
  if (!isAdmin && task.created_by.toString() !== req.user.id) {
    return res.status(403).json({ error: 'Cannot delete this task' });
  }

  await db.collection('tasks').deleteOne({ _id: taskId });
  res.json({ message: 'Task deleted' });
}));

// POST /api/projects/:projectId/tasks/:taskId/comments
router.post('/:taskId/comments', authenticate, requireProjectAccess, [
  body('content').trim().notEmpty(),
], wrap(async (req, res) => {
  if (!ObjectId.isValid(req.params.projectId) || !ObjectId.isValid(req.params.taskId)) {
    return res.status(400).json({ error: 'Invalid project or task ID' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  const taskId = new ObjectId(req.params.taskId);
  const commentDoc = {
    task_id: taskId,
    user_id: new ObjectId(req.user.id),
    content: req.body.content,
    created_at: new Date(),
  };

  const result = await db.collection('comments').insertOne(commentDoc);
  const comment = await db.collection('comments').aggregate([
    { $match: { _id: result.insertedId } },
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
      $addFields: {
        user_name: '$user.name',
        avatar_color: '$user.avatar_color',
      },
    },
    { $project: { user: 0 } },
  ]).next();

  res.status(201).json({ comment: serializeComment(comment) });
}));

module.exports = router;