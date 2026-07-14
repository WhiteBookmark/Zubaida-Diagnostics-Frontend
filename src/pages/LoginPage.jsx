import { useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import { Person, Lock } from '@mui/icons-material';
import logo from '../assets/Logo.png';
import '../styles/Auth.css';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data.user.username, data.token);
      } else {
        setError(data.error || 'Invalid username or password');
      }
    } catch (err) {
      console.error(err);
      setError('Server connection error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <img src={logo} alt="Logo" style={{ height: '60px', marginBottom: '20px' }} />
        <h2 style={{ color: '#0f172a' }}>Login to Web Portal</h2>
        
        {error && <p className="error" style={{ color: '#ef4444' }}>{error}</p>}
        
        <div className="input-group">
          <label className="input-label" htmlFor="username">
            Username
          </label>
          <div className="input-with-icon">
            <Person className="input-icon" />
            <input
              id="username"
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="password">
            Password
          </label>
          <div className="input-with-icon">
            <Lock className="input-icon" />
            <input
              id="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <Button 
          variant="contained" 
          type="submit" 
          fullWidth 
          disabled={loading}
          sx={{ mt: 1, gap: 1 }}
        >
          {loading ? (
            <>
              <CircularProgress size={20} color="inherit" />
              Signing In...
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>
    </div>
  );
}
