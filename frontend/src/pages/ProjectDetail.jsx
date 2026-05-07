import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit, Users, X, MessageSquare, ChevronDown } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal, StatusBadge, PriorityBadge, Spinner, Avatar, ColorPicker, PROJECT_COLORS } from '../components/UI';

const COLUMNS = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
];

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('board');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const load = async () => {
    const [projRes, taskRes, usersRes] = await Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/projects/${id}/tasks`),
      api.get('/auth/users'),
    ]);
    setProject(projRes.data.project);
    setTasks(taskRes.data.tasks);
    setUsers(usersRes.data.users);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const isAdmin = user?.role === 'admin' || project?.userRole === 'admin';

  const handleCreateTask = async (form) => {
    const res = await api.post(`/projects/${id}/tasks`, form);
    setTasks(prev => [res.data.task, ...prev]);
    setShowCreateTask(false);
    toast.success('Task created!');
  };

  const handleUpdateTask = async (taskId, updates) => {
    const res = await api.put(`/projects/${id}/tasks/${taskId}`, updates);
    setTasks(prev => prev.map(t => t.id === taskId ? res.data.task : t));
    if (selectedTask?.id === taskId) setSelectedTask(res.data.task);
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    await api.delete(`/projects/${id}/tasks/${taskId}`);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setSelectedTask(null);
    toast.success('Task deleted');
  };

  const handleDeleteProject = async () => {
    if (!confirm('Delete this project and all its tasks?')) return;
    await api.delete(`/projects/${id}`);
    navigate('/projects');
    toast.success('Project deleted');
  };

  if (loading) return <Spinner />;
  if (!project) return <div className="content-full"><p>Project not found.</p></div>;

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{marginBottom:20}}>
        <div className="flex items-center gap-3">
          <div style={{width:14,height:14,borderRadius:'50%',background:project.color}}/>
          <div>
            <h1 className="page-title">{project.name}</h1>
            {project.description && <p className="page-subtitle">{project.description}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowMembers(true)}><Users size={14}/> Members ({project.members?.length})</button>
          {isAdmin && <button className="btn btn-secondary btn-sm" onClick={() => setShowEdit(true)}><Edit size={14}/> Edit</button>}
          {isAdmin && <button className="btn btn-danger btn-sm" onClick={handleDeleteProject}><Trash2 size={14}/></button>}
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateTask(true)}><Plus size={14}/> Add Task</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{padding:'0 32px 16px'}}>
        <div className="tabs" style={{width:'fit-content'}}>
          <button className={`tab ${tab === 'board' ? 'active' : ''}`} onClick={() => setTab('board')}>Board</button>
          <button className={`tab ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>List</button>
        </div>
      </div>

      {/* Board */}
      {tab === 'board' && (
        <div className="kanban-board">
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.id);
            return (
              <div key={col.id} className="kanban-col">
                <div className="kanban-col-header">
                  <span className="kanban-col-title">{col.label}</span>
                  <span className="kanban-col-count">{colTasks.length}</span>
                </div>
                {colTasks.map(task => (
                  <div key={task.id} className="task-card" onClick={() => setSelectedTask(task)}>
                    <div className="task-card-title">{task.title}</div>
                    <div className="task-meta">
                      <PriorityBadge priority={task.priority}/>
                      {task.assignee_name && (
                        <div className="flex items-center gap-1 text-xs text-muted" style={{marginLeft:'auto'}}>
                          <Avatar name={task.assignee_name} color={task.assignee_color} size="sm"/>
                        </div>
                      )}
                    </div>
                    {task.due_date && (
                      <div className="text-xs mt-1" style={{color: new Date(task.due_date) < new Date() && task.status !== 'done' ? 'var(--red)' : 'var(--text3)'}}>
                        📅 {new Date(task.due_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm" style={{justifyContent:'center',border:'1px dashed var(--border)',borderRadius:'var(--radius)'}} onClick={() => { setShowCreateTask({status: col.id}); }}>
                  <Plus size={13}/> Add task
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* List view */}
      {tab === 'list' && (
        <div className="content-full">
          <div className="card">
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{borderBottom:'1px solid var(--border)'}}>
                  {['Task','Status','Priority','Assignee','Due Date',''].map(h => (
                    <th key={h} style={{padding:'10px 16px',textAlign:'left',fontSize:12,color:'var(--text3)',fontWeight:600,letterSpacing:'0.5px',textTransform:'uppercase'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id} style={{borderBottom:'1px solid var(--border)',cursor:'pointer'}} onClick={() => setSelectedTask(task)}>
                    <td style={{padding:'12px 16px'}}>
                      <div style={{fontWeight:500}}>{task.title}</div>
                      {task.description && <div className="text-xs text-muted truncate" style={{maxWidth:300}}>{task.description}</div>}
                    </td>
                    <td style={{padding:'12px 16px'}}><StatusBadge status={task.status}/></td>
                    <td style={{padding:'12px 16px'}}><PriorityBadge priority={task.priority}/></td>
                    <td style={{padding:'12px 16px'}}>
                      {task.assignee_name ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={task.assignee_name} color={task.assignee_color} size="sm"/>
                          <span className="text-sm">{task.assignee_name}</span>
                        </div>
                      ) : <span className="text-dim text-sm">Unassigned</span>}
                    </td>
                    <td style={{padding:'12px 16px'}}>
                      {task.due_date ? (
                        <span className="text-sm" style={{color: new Date(task.due_date) < new Date() && task.status !== 'done' ? 'var(--red)' : 'var(--text2)'}}>
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      ) : <span className="text-dim text-sm">—</span>}
                    </td>
                    <td style={{padding:'12px 16px'}} onClick={e => e.stopPropagation()}>
                      {(isAdmin || task.created_by === user?.id) && (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteTask(task.id)}><Trash2 size={13}/></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tasks.length === 0 && (
              <div className="empty-state"><p>No tasks yet. Add your first task!</p></div>
            )}
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal task={selectedTask} users={project.members || []} isAdmin={isAdmin}
          currentUser={user} projectId={id}
          onUpdate={handleUpdateTask} onDelete={handleDeleteTask} onClose={() => setSelectedTask(null)} />
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <CreateTaskModal
          members={project.members || []}
          initialStatus={typeof showCreateTask === 'object' ? showCreateTask.status : 'todo'}
          onCreate={handleCreateTask} onClose={() => setShowCreateTask(false)} />
      )}

      {/* Members Modal */}
      {showMembers && (
        <MembersModal project={project} users={users} isAdmin={isAdmin}
          onClose={() => setShowMembers(false)} onRefresh={load} />
      )}

      {/* Edit Modal */}
      {showEdit && (
        <EditProjectModal project={project} onClose={() => setShowEdit(false)}
          onUpdated={(p) => { setProject({...project, ...p}); setShowEdit(false); toast.success('Project updated!'); }} />
      )}
    </div>
  );
}

function TaskDetailModal({ task, users, isAdmin, currentUser, projectId, onUpdate, onDelete, onClose }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: task.title, description: task.description || '', status: task.status, priority: task.priority, assignee_id: task.assignee_id || '', due_date: task.due_date || '' });
  const [comments, setComments] = useState(task.comments || []);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const canEdit = isAdmin || task.created_by === currentUser?.id || task.assignee_id === currentUser?.id;

  const handleSave = async () => {
    setLoading(true);
    await onUpdate(task.id, { ...form, assignee_id: form.assignee_id || null });
    setEditing(false);
    setLoading(false);
  };

  const handleStatusChange = async (status) => {
    await onUpdate(task.id, { status });
    form.status = status;
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    const res = await api.post(`/projects/${projectId}/tasks/${task.id}/comments`, { content: comment });
    setComments(prev => [...prev, res.data.comment]);
    setComment('');
  };

  return (
    <Modal title={editing ? 'Edit Task' : task.title} onClose={onClose} size="lg" footer={
      editing ? (
        <>
          <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>Save</button>
        </>
      ) : (
        <div className="flex gap-2 w-full">
          {canEdit && <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}><Edit size={13}/> Edit</button>}
          {(isAdmin || task.created_by === currentUser?.id) && (
            <button className="btn btn-danger btn-sm" onClick={() => onDelete(task.id)}><Trash2 size={13}/> Delete</button>
          )}
          <div style={{marginLeft:'auto'}}>
            <select className="form-input" style={{padding:'6px 10px',fontSize:13}} value={form.status}
              onChange={e => { setForm({...form, status: e.target.value}); handleStatusChange(e.target.value); }}>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>
      )
    }>
      {editing ? (
        <>
          <div className="form-group"><label className="form-label">Title</label>
            <input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})}/>
          </div>
          <div className="form-group"><label className="form-label">Description</label>
            <textarea className="form-input" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})}/>
          </div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                <option value="todo">To Do</option><option value="in_progress">In Progress</option>
                <option value="review">Review</option><option value="done">Done</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">Priority</label>
              <select className="form-input" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                <option value="low">Low</option><option value="medium">Medium</option>
                <option value="high">High</option><option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Assignee</label>
              <select className="form-input" value={form.assignee_id} onChange={e => setForm({...form, assignee_id: e.target.value})}>
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Due Date</label>
              <input className="form-input" type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})}/>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex gap-2 mb-3 flex-wrap">
            <StatusBadge status={task.status}/>
            <PriorityBadge priority={task.priority}/>
          </div>
          {task.description && <p style={{color:'var(--text2)',marginBottom:16,lineHeight:1.6}}>{task.description}</p>}
          <div className="grid-2 mb-4">
            <div><div className="text-xs text-dim mb-1">Assignee</div>
              {task.assignee_name ? (
                <div className="flex items-center gap-2"><Avatar name={task.assignee_name} color={task.assignee_color} size="sm"/><span className="text-sm">{task.assignee_name}</span></div>
              ) : <span className="text-sm text-muted">Unassigned</span>}
            </div>
            <div><div className="text-xs text-dim mb-1">Due Date</div>
              <span className="text-sm">{task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}</span>
            </div>
          </div>
          <div className="divider"/>
          <div>
            <div className="flex items-center gap-2 mb-3"><MessageSquare size={15}/><span className="font-semibold text-sm">Comments ({comments.length})</span></div>
            {comments.map(c => (
              <div key={c.id} className="flex gap-2 mb-3">
                <Avatar name={c.user_name} color={c.avatar_color} size="sm"/>
                <div style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'8px 12px',flex:1}}>
                  <div className="flex justify-between mb-1"><span className="text-sm font-semibold">{c.user_name}</span>
                    <span className="text-xs text-dim">{new Date(c.created_at).toLocaleDateString()}</span></div>
                  <p className="text-sm">{c.content}</p>
                </div>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <input className="form-input" placeholder="Add a comment..." value={comment} onChange={e => setComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleComment()}/>
              <button className="btn btn-primary btn-sm" onClick={handleComment}>Post</button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}

function CreateTaskModal({ members, initialStatus, onCreate, onClose }) {
  const [form, setForm] = useState({ title: '', description: '', status: initialStatus, priority: 'medium', assignee_id: '', due_date: '' });
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setLoading(true);
    await onCreate({ ...form, assignee_id: form.assignee_id || null });
    setLoading(false);
  };

  return (
    <Modal title="New Task" onClose={onClose} footer={
      <><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>{loading ? 'Creating...' : 'Create Task'}</button></>
    }>
      <div className="form-group"><label className="form-label">Title *</label>
        <input className="form-input" placeholder="Task title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} autoFocus/>
      </div>
      <div className="form-group"><label className="form-label">Description</label>
        <textarea className="form-input" rows={2} placeholder="Optional details..." value={form.description} onChange={e => setForm({...form, description: e.target.value})}/>
      </div>
      <div className="grid-2">
        <div className="form-group"><label className="form-label">Status</label>
          <select className="form-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
            <option value="todo">To Do</option><option value="in_progress">In Progress</option>
            <option value="review">Review</option><option value="done">Done</option>
          </select>
        </div>
        <div className="form-group"><label className="form-label">Priority</label>
          <select className="form-input" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
            <option value="low">Low</option><option value="medium">Medium</option>
            <option value="high">High</option><option value="critical">Critical</option>
          </select>
        </div>
      </div>
      <div className="grid-2">
        <div className="form-group"><label className="form-label">Assign to</label>
          <select className="form-input" value={form.assignee_id} onChange={e => setForm({...form, assignee_id: e.target.value})}>
            <option value="">Unassigned</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Due Date</label>
          <input className="form-input" type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})}/>
        </div>
      </div>
    </Modal>
  );
}

function MembersModal({ project, users, isAdmin, onClose, onRefresh }) {
  const [addUserId, setAddUserId] = useState('');
  const [addRole, setAddRole] = useState('member');
  const toast = useToast();

  const existingIds = project.members?.map(m => m.id) || [];
  const available = users.filter(u => !existingIds.includes(u.id));

  const handleAdd = async () => {
    if (!addUserId) return;
    await api.post(`/projects/${project.id}/members`, { user_id: addUserId, role: addRole });
    toast.success('Member added');
    setAddUserId('');
    onRefresh();
  };

  const handleRemove = async (userId) => {
    if (!confirm('Remove this member?')) return;
    await api.delete(`/projects/${project.id}/members/${userId}`);
    toast.success('Member removed');
    onRefresh();
  };

  return (
    <Modal title="Project Members" onClose={onClose} footer={<button className="btn btn-secondary" onClick={onClose}>Close</button>}>
      {project.members?.map(m => (
        <div key={m.id} className="member-row">
          <Avatar name={m.name} color={m.avatar_color}/>
          <div style={{flex:1}}>
            <div className="font-semibold text-sm">{m.name}</div>
            <div className="text-xs text-muted">{m.email}</div>
          </div>
          <span className={`badge badge-${m.project_role}`}>{m.project_role}</span>
          {isAdmin && <button className="btn btn-ghost btn-sm" onClick={() => handleRemove(m.id)}><X size={13}/></button>}
        </div>
      ))}
      {isAdmin && available.length > 0 && (
        <>
          <div className="divider"/>
          <div className="form-group"><label className="form-label">Add member</label>
            <div className="flex gap-2">
              <select className="form-input" value={addUserId} onChange={e => setAddUserId(e.target.value)}>
                <option value="">Select user...</option>
                {available.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
              <select className="form-input" style={{width:110}} value={addRole} onChange={e => setAddRole(e.target.value)}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button className="btn btn-primary" onClick={handleAdd}>Add</button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}

function EditProjectModal({ project, onClose, onUpdated }) {
  const [form, setForm] = useState({ name: project.name, description: project.description || '', color: project.color });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    const res = await api.put(`/projects/${project.id}`, form);
    onUpdated(res.data.project);
    setLoading(false);
  };

  return (
    <Modal title="Edit Project" onClose={onClose} footer={
      <><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={loading}>Save</button></>
    }>
      <div className="form-group"><label className="form-label">Name</label>
        <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})}/>
      </div>
      <div className="form-group"><label className="form-label">Description</label>
        <textarea className="form-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})}/>
      </div>
      <div className="form-group"><label className="form-label">Color</label>
        <ColorPicker value={form.color} onChange={c => setForm({...form, color: c})}/>
      </div>
    </Modal>
  );
}
