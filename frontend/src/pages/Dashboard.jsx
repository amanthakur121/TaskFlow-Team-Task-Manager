import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, PriorityBadge, Spinner, Avatar } from '../components/UI';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data) return null;

  const { stats, myTasks, overdueTasks, recentActivity, projectProgress } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Here's what's happening across your projects</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard icon={<LayoutDashboard/>} color="#6366f1" value={stats.total_projects} label="Projects" />
        <StatCard icon={<CheckSquare/>} color="#10b981" value={stats.done_tasks} label="Completed" />
        <StatCard icon={<Clock/>} color="#3b82f6" value={stats.in_progress_tasks} label="In Progress" />
        <StatCard icon={<AlertTriangle/>} color="#ef4444" value={stats.overdue_tasks} label="Overdue" />
      </div>

      <div className="content-grid">
        {/* My Tasks */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-display font-bold">My Tasks</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/my-tasks')}>View all →</button>
          </div>
          <div className="card-body" style={{padding:'12px 16px'}}>
            {myTasks.length === 0 ? (
              <div className="empty-state" style={{padding:'24px 0'}}>
                <CheckSquare size={32} style={{margin:'0 auto 8px',color:'var(--green)'}}/>
                <p>All caught up! No tasks assigned.</p>
              </div>
            ) : myTasks.slice(0, 6).map(task => (
              <div key={task.id} className="task-card mb-2" onClick={() => navigate(`/projects/${task.project_id}`)}>
                <div className="task-card-title">{task.title}</div>
                <div className="task-meta">
                  <StatusBadge status={task.status} />
                  <PriorityBadge priority={task.priority} />
                  <span className="text-xs text-dim" style={{marginLeft:'auto'}}>{task.project_name}</span>
                </div>
                {task.due_date && (
                  <div className="text-xs mt-1" style={{color: new Date(task.due_date) < new Date() ? 'var(--red)' : 'var(--text3)'}}>
                    Due {new Date(task.due_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Project Progress */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-display font-bold">Project Progress</h3>
          </div>
          <div className="card-body">
            {projectProgress.length === 0 ? (
              <div className="empty-state" style={{padding:'24px 0'}}>
                <p>No projects yet.</p>
              </div>
            ) : projectProgress.map(p => {
              const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
              return (
                <div key={p.id} className="mb-4" style={{cursor:'pointer'}} onClick={() => navigate(`/projects/${p.id}`)}>
                  <div className="flex justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div style={{width:10,height:10,borderRadius:'50%',background:p.color}}/>
                      <span className="font-semibold text-sm">{p.name}</span>
                    </div>
                    <span className="text-sm text-muted">{p.done}/{p.total}</span>
                  </div>
                  <div className="progress-bar">
                    <div className={`progress-fill ${pct === 100 ? 'green' : ''}`} style={{width:`${pct}%`}}/>
                  </div>
                  {p.overdue > 0 && <div className="text-xs mt-1" style={{color:'var(--red)'}}>⚠ {p.overdue} overdue</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Overdue */}
        {overdueTasks.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="font-display font-bold" style={{color:'var(--red)'}}>⚠ Overdue Tasks</h3>
            </div>
            <div className="card-body" style={{padding:'12px 16px'}}>
              {overdueTasks.map(task => (
                <div key={task.id} className="task-card mb-2" onClick={() => navigate(`/projects/${task.project_id}`)}>
                  <div className="task-card-title">{task.title}</div>
                  <div className="task-meta">
                    <PriorityBadge priority={task.priority}/>
                    <span className="text-xs" style={{color:'var(--red)'}}>
                      Due {new Date(task.due_date).toLocaleDateString()}
                    </span>
                    <span className="text-xs text-dim" style={{marginLeft:'auto'}}>{task.project_name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-display font-bold">Recent Activity</h3>
          </div>
          <div className="card-body" style={{padding:'12px 16px'}}>
            {recentActivity.map(task => (
              <div key={task.id} className="flex items-center gap-3 mb-3" style={{cursor:'pointer'}} onClick={() => navigate(`/projects/${task.project_id}`)}>
                <div style={{width:8,height:8,borderRadius:'50%',background:task.project_color,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div className="truncate text-sm">{task.title}</div>
                  <div className="text-xs text-dim">{task.project_name}</div>
                </div>
                <div><StatusBadge status={task.status}/></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, color, value, label }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{background:`${color}20`,color}}>{icon}</div>
      <div className="stat-value">{value ?? 0}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}
