import { useState } from 'react';
import { Button } from '@mui/material';
import logo from '../assets/Logo.png';
import '../styles/Auth.css';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'password') {
      onLogin(username);
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <img src={logo} alt="Logo" style={{ height: '60px', marginBottom: '20px' }} />
        <h2 style={{ color: '#0f172a' }}>Login to Web Portal</h2>
        {error && <p className="error" style={{ color: '#ef4444' }}>{error}</p>}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="glass-input"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="glass-input"
        />
        <Button variant="contained" type="submit" fullWidth sx={{ mt: 1 }}>
          Sign In
        </Button>
      </form>
    </div>
  );
}
