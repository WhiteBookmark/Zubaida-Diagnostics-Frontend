import React from 'react';
import logo from './assets/Glassmorphism Logo ZD.png';

export default function Header({ currentPage, setCurrentPage, onLogout }) {
  const links = [
    { name: 'Patient Records', id: 'patients' },
    { name: 'Vital Records', id: 'vitals' },
    { name: 'Appointment Records', id: 'appointments' },
    { name: 'Documents', id: 'documents' },
  ];

  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', backgroundColor: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img src={logo} alt="Zubaida Diagnostics Logo" style={{ height: '40px' }} />
        <nav>
          <ul style={{ display: 'flex', listStyle: 'none', gap: '20px', margin: 0, padding: 0 }}>
            {links.map(link => (
              <li key={link.id}>
                <button
                  onClick={() => setCurrentPage(link.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: currentPage === link.id ? 'bold' : 'normal',
                    color: currentPage === link.id ? '#007bff' : '#333'
                  }}
                >
                  {link.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <button onClick={onLogout} style={{ padding: '5px 15px' }}>Logout</button>
    </header>
  );
}
