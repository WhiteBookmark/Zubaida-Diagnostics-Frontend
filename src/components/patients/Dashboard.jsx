import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import EventNoteIcon from '@mui/icons-material/EventNote';
import FolderIcon from '@mui/icons-material/Folder';

export default function Dashboard() {
  const [counts, setCounts] = useState({
    patients: 0,
    appointments: 0,
    documents: 0
  });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [patientsRes, appointmentsRes, documentsRes] = await Promise.all([
          fetch('/api/patients'),
          fetch('/api/appointments'),
          fetch('/api/documents')
        ]);
        const pData = await patientsRes.json();
        const aData = await appointmentsRes.json();
        const dData = await documentsRes.json();

        const getCount = (res) => Array.isArray(res) ? res.length : (res.data ? res.data.length : 0);

        setCounts({
          patients: getCount(pData),
          appointments: getCount(aData),
          documents: getCount(dData)
        });
      } catch (err) {
        console.error('Error fetching counts:', err);
      }
    };
    fetchCounts();
  }, []);

  const statCards = [
    {
      title: 'Total Patients',
      count: counts.patients,
      icon: <PeopleIcon sx={{ fontSize: 28, color: 'var(--text)' }} />
    },
    {
      title: 'Total Appointments',
      count: counts.appointments,
      icon: <EventNoteIcon sx={{ fontSize: 28, color: 'var(--text)' }} />
    },
    {
      title: 'Total Documents',
      count: counts.documents,
      icon: <FolderIcon sx={{ fontSize: 28, color: 'var(--text)' }} />
    }
  ];

  return (
    <div className="dashboard glass" style={{ padding: '40px', margin: '0 20px 40px 20px' }}>
      <div className="header" style={{ marginBottom: '2rem' }}>
        <h2>Dashboard Overview</h2>
      </div>

      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '30px' 
      }}>
        {statCards.map((stat, index) => (
          <Box 
            key={index}
            className="glass"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '15px',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              transition: 'transform 0.3s ease',
              '&:hover': {
                transform: 'translateY(-5px)'
              }
            }}
          >
            {stat.icon}
            <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1, color: 'var(--text-h)' }}>
              {stat.count}
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--text)', mt: 0.5 }}>
              {stat.title}
            </Typography>
          </Box>
        ))}
      </Box>
    </div>
  );
}
