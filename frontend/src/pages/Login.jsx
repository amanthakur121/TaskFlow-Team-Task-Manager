import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      await login('demo@taskflow.app', 'demo1234');
      toast.success('Logged in as demo user');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-mark">TF</div>
          <div className="auth-logo-name">TaskFlow</div>
          <div className="auth-logo-tagline">Collaborative task management</div>
        </div>

        <div className="card">
          <div className="card-body">
            <h2 style={{fontFamily:'var(--font-display)',fontWeight:700,marginBottom:20,fontSize:20}}>Welcome back</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="you@example.com"
                  value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="••••••••"
                  value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
              </div>
              <button className="btn btn-primary w-full" style={{justifyContent:'center',marginTop:4}} disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
              <button type="button" className="btn btn-secondary w-full" style={{justifyContent:'center',marginTop:12}} onClick={handleDemoLogin} disabled={loading}>
                {loading ? 'Signing in...' : 'Use demo account'}
              </button>
            </form>
            <p className="text-muted text-sm" style={{textAlign:'center',marginTop:16}}>
              Don't have an account? <Link to="/signup" style={{color:'var(--accent)'}}>Sign up</Link>
            </p>
          </div>
        </div>

        <div style={{textAlign:'center',marginTop:16,color:'var(--text2)',fontSize:13}}>
          <p>Demo account available:</p>
          <p><strong>demo@taskflow.app</strong> / <strong>demo1234</strong></p>
          <p>Or click <strong>Use demo account</strong> to sign in instantly.</p>
        </div>
      </div>
    </div>
  );
}
