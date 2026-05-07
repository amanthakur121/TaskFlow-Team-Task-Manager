# 🚀 TaskFlow — Team Task Manager

A full-stack collaborative task management app with role-based access control, Kanban boards, and a custom neon-cyber UI that stands apart from generic student templates.

## 🌐 Live Demo
> **[https://your-app.up.railway.app](https://your-app.up.railway.app)**

## 📹 Demo Video
> Link to 2–5 min Loom/YouTube demo

## 📦 GitHub
> [https://github.com/your-username/taskflow](https://github.com/your-username/taskflow)

---

## ✨ Features

### 🔐 Authentication
- Signup & Login with JWT tokens
- Role-based: **Admin** and **Member** roles
- Demo account seeded for quick preview
- Secure password hashing with bcrypt

### 📁 Project Management
- Create, edit, delete projects
- Custom project colors
- Per-project team membership
- Project-level roles (Admin / Member)

### ✅ Task Management
- Create tasks with title, description, priority, due date
- Assign tasks to team members
- Status tracking: **To Do → In Progress → Review → Done**
- Priority levels: Low, Medium, High, Critical
- Comments on tasks
- Overdue detection

### 📊 Dashboard
- Overview stats (projects, completed, in-progress, overdue)
- My assigned tasks
- Project progress bars
- Recent activity feed

### 👥 Team Management
- Add/remove members per project
- Assign project-level roles
- Admin-only Users overview page

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Vite |
| Backend | Node.js, Express |
| Database | MongoDB (native driver) |
| Auth | JWT + bcrypt |
| Validation | express-validator |
| Deployment | Railway |

---

## 🚢 Deploy to Railway

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/taskflow.git
git push -u origin main
```

### 2. Deploy on Railway
1. Go to [railway.app](https://railway.app) and sign in
2. Click **New Project → Deploy from GitHub repo**
3. Select your `taskflow` repository
4. Railway auto-detects `railway.toml` configuration

### 3. Set Environment Variables in Railway
```
NODE_ENV=production
JWT_SECRET=your-random-secret-string-here
MONGO_URI=your-mongodb-connection-string
DB_NAME=taskflow
FRONTEND_URL=https://your-app.up.railway.app
PORT=4000
```

> If you use Railway's MongoDB plugin, paste the generated connection string into `MONGO_URI`.

Your app will be live at `https://your-app.up.railway.app` 🎉

---

## 💻 Local Development

### Prerequisites
- Node.js 18+
- npm
- MongoDB running locally or a hosted MongoDB connection

### Setup

```bash
# Clone the repo
git clone https://github.com/your-username/taskflow.git
cd taskflow

# Install all dependencies
npm run install:all

# Set required backend env vars in your terminal or deployment platform
# Example: MONGO_URI, DB_NAME, JWT_SECRET, FRONTEND_URL

# Start backend (port 4000)
npm run dev:backend

# In another terminal — start frontend (port 5173)
npm run dev:frontend
```

Open http://localhost:5173

### Demo account
- Email: `demo@taskflow.app`
- Password: `demo1234`

### Create your first admin account
Go to `/signup` and select **Admin** role to get full access.

---

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| GET | `/api/auth/users` | List all users |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | My projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Project details + members |
| PUT | `/api/projects/:id` | Update project (admin) |
| DELETE | `/api/projects/:id` | Delete project (admin) |
| POST | `/api/projects/:id/members` | Add member (admin) |
| DELETE | `/api/projects/:id/members/:userId` | Remove member (admin) |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/tasks` | List tasks (filterable) |
| POST | `/api/projects/:id/tasks` | Create task |
| GET | `/api/projects/:id/tasks/:tid` | Task detail + comments |
| PUT | `/api/projects/:id/tasks/:tid` | Update task |
| DELETE | `/api/projects/:id/tasks/:tid` | Delete task |
| POST | `/api/projects/:id/tasks/:tid/comments` | Add comment |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Stats, my tasks, activity |

---

## 🛡 Role-Based Access Control

| Action | Global Admin | Project Admin | Project Member |
|--------|-------------|---------------|----------------|
| Create project | ✅ | ✅ | ✅ |
| Edit/delete project | ✅ | ✅ | ❌ |
| Add/remove members | ✅ | ✅ | ❌ |
| Create task | ✅ | ✅ | ✅ |
| Edit any task | ✅ | ✅ | own/assigned |
| Delete any task | ✅ | ✅ | own only |
| View users list | ✅ | ❌ | ❌ |

---

## 📁 Project Structure

```
taskflow/
├── backend/
│   ├── db/
│   │   └── database.js       # MongoDB schema & connection
│   ├── middleware/
│   │   └── auth.js           # JWT + RBAC middleware
│   ├── routes/
│   │   ├── auth.js           # Auth endpoints
│   │   ├── projects.js       # Project CRUD
│   │   ├── tasks.js          # Task CRUD + comments
│   │   └── dashboard.js      # Dashboard aggregations
│   ├── server.js             # Express app entry
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── context/          # Auth + Toast context
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Route pages
│   │   ├── api.js            # Axios client
│   │   ├── App.jsx           # Router
│   │   └── index.css         # Design system
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── railway.toml              # Railway deployment config
├── .env.example
└── README.md
```

---

## 🎨 Design System

Built with a custom neon-cyber design system featuring:
- **Space Grotesk** display font (headings/logo)
- **Karla** body font
- Teal/orange accent palette with glassmorphism textures
- Bold dark layout and modern alpine-inspired dashboard styling
- Unique UI and visual identity to differentiate from common student projects

---

Made with ❤️ for the TaskFlow assignment
