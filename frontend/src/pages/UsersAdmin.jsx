import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import api from '../api';
import { Avatar, Spinner } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function UsersAdmin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  if (user?.role !== 'admin') return <Navigate to="/dashboard" />;

  useEffect(() => {
    api.get('/auth/users').then(r => setUsers(r.data.users)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">{users.length} registered user{users.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <div className="content-full">
        <div className="card">
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:'1px solid var(--border)'}}>
                {['User','Email','Role','Joined'].map(h => (
                  <th key={h} style={{padding:'10px 16px',textAlign:'left',fontSize:12,color:'var(--text3)',fontWeight:600,letterSpacing:'0.5px',textTransform:'uppercase'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{borderBottom:'1px solid var(--border)'}}>
                  <td style={{padding:'12px 16px'}}>
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} color={u.avatar_color}/>
                      <span className="font-semibold">{u.name} {u.id === user?.id && <span className="text-xs text-muted">(you)</span>}</span>
                    </div>
                  </td>
                  <td style={{padding:'12px 16px'}}><span className="text-muted text-sm">{u.email}</span></td>
                  <td style={{padding:'12px 16px'}}><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                  <td style={{padding:'12px 16px'}}><span className="text-sm text-muted">{new Date(u.created_at).toLocaleDateString()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
