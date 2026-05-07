import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderKanban } from 'lucide-react';
import api from '../api';
import { Modal, ColorPicker, Spinner, PROJECT_COLORS } from '../components/UI';
import { useToast } from '../context/ToastContext';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const load = () => api.get('/projects').then(r => setProjects(r.data.projects)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={15}/> New Project</button>
      </div>

      <div style={{padding:'24px 32px',display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
        {projects.length === 0 ? (
          <div className="empty-state" style={{gridColumn:'1/-1'}}>
            <FolderKanban/>
            <h3>No projects yet</h3>
            <p>Create your first project to get started</p>
            <button className="btn btn-primary mt-3" onClick={() => setShowCreate(true)}><Plus size={15}/> New Project</button>
          </div>
        ) : projects.map(p => (
          <div key={p.id} className="project-card" onClick={() => navigate(`/projects/${p.id}`)}>
            <div className="project-color-bar" style={{background: p.color}}/>
            <div className="project-name">{p.name}</div>
            <p className="project-desc">{p.description || 'No description'}</p>
            <div className="project-stats">
              <div className="project-stat"><strong>{p.member_count}</strong> members</div>
              <div className="project-stat"><strong>{p.done_count}/{p.task_count}</strong> tasks done</div>
            </div>
          </div>
        ))}
      </div>

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreated={(p) => { setProjects(prev => [p, ...prev]); setShowCreate(false); toast.success('Project created!'); }} />}
    </div>
  );
}

function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', color: PROJECT_COLORS[0] });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/projects', form);
      onCreated(res.data.project);
    } finally { setLoading(false); }
  };

  return (
    <Modal title="New Project" onClose={onClose} footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>{loading ? 'Creating...' : 'Create Project'}</button>
      </>
    }>
      <div className="form-group">
        <label className="form-label">Project name *</label>
        <input className="form-input" placeholder="e.g. Website Redesign" value={form.name} onChange={e => setForm({...form, name: e.target.value})} autoFocus />
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-input" placeholder="What's this project about?" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
      </div>
      <div className="form-group">
        <label className="form-label">Color</label>
        <ColorPicker value={form.color} onChange={c => setForm({...form, color: c})} />
      </div>
    </Modal>
  );
}
