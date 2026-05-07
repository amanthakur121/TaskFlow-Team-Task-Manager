import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare } from 'lucide-react';
import api from '../api';
import { StatusBadge, PriorityBadge, Spinner, Avatar } from '../components/UI';

export default function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch all projects then get tasks assigned to me
    api.get('/projects').then(async res => {
      const all = [];
      for (const p of res.data.projects) {
        const tr = await api.get(`/projects/${p.id}/tasks`, { params: { assignee: 'me' } });
        all.push(...tr.data.tasks.filter(t => t.assignee_id));
      }
      // Get all tasks from dashboard instead
      setLoading(false);
    });
    // Use dashboard endpoint for simplicity
    api.get('/dashboard').then(res => {
      setTasks([
        ...res.data.myTasks,
        ...(res.data.overdueTasks || [])
      ].filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i));
      setLoading(false);
    });
  }, []);

  const filtered = filter === 'active'
    ? tasks.filter(t => t.status !== 'done')
    : filter === 'done'
    ? tasks.filter(t => t.status === 'done')
    : tasks;

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Tasks</h1>
          <p className="page-subtitle">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <div style={{padding:'16px 32px'}}>
        <div className="tabs" style={{width:'fit-content',marginBottom:20}}>
          {[['active','Active'],['done','Completed'],['all','All']].map(([v,l]) => (
            <button key={v} className={`tab ${filter === v ? 'active' : ''}`} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>

        <div className="card">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <CheckSquare/>
              <h3>No tasks here</h3>
              <p>Tasks assigned to you will appear here</p>
            </div>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{borderBottom:'1px solid var(--border)'}}>
                  {['Task','Project','Status','Priority','Due Date'].map(h => (
                    <th key={h} style={{padding:'10px 16px',textAlign:'left',fontSize:12,color:'var(--text3)',fontWeight:600,letterSpacing:'0.5px',textTransform:'uppercase'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(task => (
                  <tr key={task.id} style={{borderBottom:'1px solid var(--border)',cursor:'pointer'}}
                    onClick={() => navigate(`/projects/${task.project_id}`)}>
                    <td style={{padding:'12px 16px'}}>
                      <div style={{fontWeight:500,textDecoration:task.status==='done'?'line-through':'none',color:task.status==='done'?'var(--text3)':'inherit'}}>{task.title}</div>
                    </td>
                    <td style={{padding:'12px 16px'}}>
                      <div className="flex items-center gap-2">
                        <div style={{width:8,height:8,borderRadius:'50%',background:task.project_color,flexShrink:0}}/>
                        <span className="text-sm text-muted">{task.project_name}</span>
                      </div>
                    </td>
                    <td style={{padding:'12px 16px'}}><StatusBadge status={task.status}/></td>
                    <td style={{padding:'12px 16px'}}><PriorityBadge priority={task.priority}/></td>
                    <td style={{padding:'12px 16px'}}>
                      {task.due_date ? (
                        <span className="text-sm" style={{color: new Date(task.due_date)<new Date() && task.status!=='done' ? 'var(--red)' : 'var(--text2)'}}>
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      ) : <span className="text-dim text-sm">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
