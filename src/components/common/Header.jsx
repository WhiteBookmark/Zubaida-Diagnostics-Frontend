import logo from '../../assets/Logo.png';

export default function Header({ currentPage, setCurrentPage, onLogout, username }) {
  const departmentUsers = ['xray', 'ultrasound', 'lab', 'prescription', 'X-Ray Department', 'Ultrasound Department', 'Lab Department', 'xr123', 'us123', 'lb123', 'ps123'];
  const prescriptionUsers = ['prescription', 'ps123', 'Prescription Department'];

  const isPrescription = prescriptionUsers.includes(username);
  const isOtherDepartment = departmentUsers.includes(username) && !isPrescription;

  const links = [
    { name: 'Patient Records', id: 'patients' },
    { name: 'Appointment Records', id: 'appointments' },
    { name: 'Documents', id: 'documents' },
    { name: 'Files', id: 'files' },
  ].filter(link => {
    if (isOtherDepartment) {
      return link.id === 'documents';
    }
    if (isPrescription) {
      return link.id === 'documents' || link.id === 'files';
    }
    return true;
  });

  return (
    <header className="glass" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', margin: '20px', marginBottom: '30px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <img src={logo} alt="Zubaida Diagnostics Logo" style={{ height: '40px', cursor: 'pointer' }} onClick={() => setCurrentPage(departmentUsers.includes(username) ? 'documents' : 'dashboard')} />
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
                    fontWeight: currentPage === link.id ? 'bold' : '500',
                    color: currentPage === link.id ? '#2563eb' : '#334155',
                    fontSize: '16px',
                    fontFamily: 'Georgia, serif',
                    padding: '8px 12px',
                    borderRadius: '8px',
                  }}
                >
                  {link.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <span style={{ color: '#334155' }}>Logged in as {username}</span>
        <button
          onClick={onLogout}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            background: 'rgba(255, 255, 255, 0.3)',
            color: '#0f172a',
            cursor: 'pointer',
            fontFamily: 'Georgia, serif',
            fontWeight: 600,
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.6)'}
          onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
