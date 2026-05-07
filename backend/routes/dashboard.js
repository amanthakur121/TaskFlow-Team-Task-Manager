const express = require('express');
const { getDb, ObjectId } = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function serializeTask(task) {
  if (!task) return null;
  return {
    ...task,
    id: task._id.toString(),
    project_id: task.project_id?.toString?.() || null,
    assignee_id: task.assignee_id?.toString?.() || null,
    created_by: task.created_by?.toString?.() || null,
  };
}

function serializeProjectProgress(project) {
  if (!project) return null;
  return {
    id: project._id.toString(),
    name: project.name,
    color: project.color,
    total: project.total,
    done: project.done,
    overdue: project.overdue,
  };
}

// GET /api/dashboard
router.get('/', authenticate, wrap(async (req, res) => {
  const db = getDb();
  const userId = new ObjectId(req.user.id);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const adminProjectIds = req.user.role === 'admin'
    ? null
    : (await db.collection('project_members').find({ user_id: userId, role: 'admin' }).toArray()).map((pm) => pm.project_id);

  const myTasks = await db.collection('tasks').aggregate([
    { $match: { assignee_id: userId, status: { $ne: 'done' } } },
    {
      $lookup: {
        from: 'projects',
        localField: 'project_id',
        foreignField: '_id',
        as: 'project',
      },
    },
    { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'project_members',
        localField: 'project_id',
        foreignField: 'project_id',
        as: 'membership',
      },
    },
    { $match: { 'membership.user_id': userId } },
    {
      $addFields: {
        project_name: '$project.name',
        project_color: '$project.color',
      },
    },
    { $project: { project: 0, membership: 0 } },
  ]).toArray();

  const overdueFilter = {
    due_date: { $lt: today },
    status: { $ne: 'done' },
  };

  if (req.user.role === 'admin') {
    // admin can see all overdue tasks
  } else if (adminProjectIds.length > 0) {
    overdueFilter.$or = [
      { assignee_id: userId },
      { project_id: { $in: adminProjectIds } },
    ];
  } else {
    overdueFilter.assignee_id = userId;
  }

  const overdueTasks = await db.collection('tasks').aggregate([
    { $match: overdueFilter },
    {
      $lookup: {
        from: 'projects',
        localField: 'project_id',
        foreignField: '_id',
        as: 'project',
      },
    },
    { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        project_name: '$project.name',
        project_color: '$project.color',
      },
    },
    { $project: { project: 0 } },
    { $sort: { due_date: 1 } },
    { $limit: 5 },
  ]).toArray();

  const membershipDocs = await db.collection('project_members').find({ user_id: userId }).toArray();
  const memberProjectIds = membershipDocs.map((pm) => pm.project_id);

  const [totalTasks, doneTasks, inProgressTasks, overdueCount] = await Promise.all([
    db.collection('tasks').countDocuments({ project_id: { $in: memberProjectIds } }),
    db.collection('tasks').countDocuments({ project_id: { $in: memberProjectIds }, status: 'done' }),
    db.collection('tasks').countDocuments({ project_id: { $in: memberProjectIds }, status: 'in_progress' }),
    db.collection('tasks').countDocuments({ project_id: { $in: memberProjectIds }, due_date: { $lt: today }, status: { $ne: 'done' } }),
  ]);

  const projectCount = memberProjectIds.length;
  const stats = {
    total_projects: projectCount,
    total_tasks: totalTasks,
    done_tasks: doneTasks,
    in_progress_tasks: inProgressTasks,
    overdue_tasks: overdueCount,
  };

  const recentActivity = await db.collection('tasks').aggregate([
    { $match: { project_id: { $in: memberProjectIds } } },
    {
      $lookup: {
        from: 'projects',
        localField: 'project_id',
        foreignField: '_id',
        as: 'project',
      },
    },
    { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        project_name: '$project.name',
        project_color: '$project.color',
      },
    },
    { $project: { project: 0 } },
    { $sort: { updated_at: -1 } },
    { $limit: 8 },
  ]).toArray();

  const projectProgress = await db.collection('projects').aggregate([
    { $match: { _id: { $in: memberProjectIds } } },
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
        total: { $size: '$tasks' },
        done: {
          $size: {
            $filter: {
              input: '$tasks',
              as: 'task',
              cond: { $eq: ['$$task.status', 'done'] },
            },
          },
        },
        overdue: {
          $size: {
            $filter: {
              input: '$tasks',
              as: 'task',
              cond: {
                $and: [
                  { $lt: ['$$task.due_date', today] },
                  { $ne: ['$$task.status', 'done'] },
                ],
              },
            },
          },
        },
      },
    },
    { $sort: { created_at: -1 } },
    { $limit: 5 },
  ]).toArray();

  res.json({
    myTasks: prioritySort(myTasks).map(serializeTask),
    overdueTasks: overdueTasks.map(serializeTask),
    stats,
    recentActivity: prioritySort(recentActivity).map(serializeTask),
    projectProgress: projectProgress.map(serializeProjectProgress),
  });
}));

function prioritySort(tasks) {
  const rank = { critical: 1, high: 2, medium: 3, low: 4 };
  return tasks.sort((a, b) => {
    const aRank = rank[a.priority] || 3;
    const bRank = rank[b.priority] || 3;
    if (aRank !== bRank) return aRank - bRank;
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

module.exports = router;
