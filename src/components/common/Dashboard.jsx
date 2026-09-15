import { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import EventNoteIcon from '@mui/icons-material/EventNote';
import FolderIcon from '@mui/icons-material/Folder';
import { buildApiUrl } from '../../config/api';

export default function Dashboard() {
  const [counts, setCounts] = useState({
    patients: 0,
    appointments: 0,
    documents: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const { signal } = controller;

    const fetchCount = async (url) => {
      const response = await fetch(url, { signal });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data && typeof data.count === 'number') {
        return data.count;
      }
      if (data && typeof data.count === 'string' && data.count.trim() !== '') {
        const parsed = Number(data.count);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
      throw new Error('Invalid count response structure');
    };

    const fetchCounts = async () => {
      try {
        const [patientsRes, appointmentsRes, documentsRes] = await Promise.allSettled([
          fetchCount(buildApiUrl('/api/patients/count/exact')),
          fetchCount(buildApiUrl('/api/appointments/count/exact')),
          fetchCount(buildApiUrl('/api/documents/count/exact'))
        ]);

        if (!isMounted) return;

        setCounts({
          patients: patientsRes.status === 'fulfilled' ? patientsRes.value : 'N/A',
          appointments: appointmentsRes.status === 'fulfilled' ? appointmentsRes.value : 'N/A',
          documents: documentsRes.status === 'fulfilled' ? documentsRes.value : 'N/A'
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching counts:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCounts();

    return () => {
      isMounted = false;
      controller.abort();
    };
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
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
        <h2>Dashboard Overview</h2>
        {loading && <CircularProgress size={24} sx={{ color: 'var(--text)' }} />}
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
            {loading ? (
              <CircularProgress size={24} sx={{ color: 'var(--accent)', mt: 1.5, mb: 1 }} />
            ) : (
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1, color: 'var(--text-h)' }}>
                {stat.count}
              </Typography>
            )}
            <Typography variant="body2" sx={{ color: 'var(--text)', mt: 0.5 }}>
              {stat.title}
            </Typography>
          </Box>
        ))}
      </Box>
    </div>
  );
}
