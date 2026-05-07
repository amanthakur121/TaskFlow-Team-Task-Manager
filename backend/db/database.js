const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'taskflow';

let client;
let db;

async function connectDb() {
  if (db) return db;

  client = new MongoClient(MONGO_URI);

  await client.connect();
  db = client.db(DB_NAME);
  await initSchema();
  await initDemoData();
  return db;
}

function getDb() {
  if (!db) throw new Error('Database is not connected yet. Call connectDb() before using getDb().');
  return db;
}

async function initSchema() {
  await Promise.all([
    db.collection('users').createIndex({ email: 1 }, { unique: true }),
    db.collection('project_members').createIndex({ project_id: 1, user_id: 1 }, { unique: true }),
    db.collection('projects').createIndex({ owner_id: 1 }),
    db.collection('tasks').createIndex({ project_id: 1 }),
    db.collection('comments').createIndex({ task_id: 1 }),
  ]);
}

async function initDemoData() {
  const demoEmail = 'demo@taskflow.app';
  const existing = await db.collection('users').findOne({ email: demoEmail });
  if (existing) return;

  const demoPassword = bcrypt.hashSync('demo1234', 10);
  const adminPassword = bcrypt.hashSync('Admin1234!', 10);

  const [adminResult, demoResult] = await Promise.all([
    db.collection('users').insertOne({
      name: 'Demo Admin',
      email: 'admin@taskflow.app',
      password: adminPassword,
      role: 'admin',
      avatar_color: '#7c55ff',
      created_at: new Date(),
    }),
    db.collection('users').insertOne({
      name: 'Demo Member',
      email: demoEmail,
      password: demoPassword,
      role: 'member',
      avatar_color: '#3b82f6',
      created_at: new Date(),
    }),
  ]);

  const projectResult = await db.collection('projects').insertOne({
    name: 'Product Launch Sprint',
    description: 'A sample project showing task progress, assignees, and status updates for a product launch.',
    color: '#7c55ff',
    owner_id: adminResult.insertedId,
    created_at: new Date(),
  });

  await db.collection('project_members').insertMany([
    {
      project_id: projectResult.insertedId,
      user_id: adminResult.insertedId,
      role: 'admin',
      joined_at: new Date(),
    },
    {
      project_id: projectResult.insertedId,
      user_id: demoResult.insertedId,
      role: 'member',
      joined_at: new Date(),
    },
  ]);

  await db.collection('tasks').insertMany([
    {
      title: 'Design landing page',
      description: 'Create a polished landing page for the launch campaign.',
      status: 'in_progress',
      priority: 'high',
      project_id: projectResult.insertedId,
      assignee_id: demoResult.insertedId,
      created_by: adminResult.insertedId,
      due_date: new Date(Date.now() + 5 * 24 * 3600 * 1000),
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      title: 'Finalize launch roadmap',
      description: 'Review the roadmap and confirm deliverables for the sprint.',
      status: 'todo',
      priority: 'medium',
      project_id: projectResult.insertedId,
      assignee_id: adminResult.insertedId,
      created_by: adminResult.insertedId,
      due_date: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      title: 'Prepare launch presentation',
      description: 'Compile stakeholder materials and launch metrics.',
      status: 'review',
      priority: 'low',
      project_id: projectResult.insertedId,
      assignee_id: demoResult.insertedId,
      created_by: adminResult.insertedId,
      due_date: new Date(Date.now() + 3 * 24 * 3600 * 1000),
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);
}

module.exports = { connectDb, getDb, ObjectId };
