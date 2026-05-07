import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, CheckSquare, Users, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './UI';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">TF</div>
        <span className="sidebar-logo-text">TaskFlow</span>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-label">Main</div>
        <NavLink to="/dashboard" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={16}/> Dashboard
        </NavLink>
        <NavLink to="/projects" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <FolderKanban size={16}/> Projects
        </NavLink>
        <NavLink to="/my-tasks" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <CheckSquare size={16}/> My Tasks
        </NavLink>
        {user?.role === 'admin' && (
          <>
            <div className="nav-label" style={{marginTop:8}}>Admin</div>
            <NavLink to="/users" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <Users size={16}/> Users
            </NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-user">
        <div className="user-card">
          <Avatar name={user?.name} color={user?.avatar_color} />
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} title="Logout">
            <LogOut size={14}/>
          </button>
        </div>
      </div>
    </aside>
  );
}
