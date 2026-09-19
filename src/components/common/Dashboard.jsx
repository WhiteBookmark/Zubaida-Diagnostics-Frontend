import { useState, useEffect, useRef } from 'react';
import { Box, Typography, CircularProgress, Button, Snackbar, Alert } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import EventNoteIcon from '@mui/icons-material/EventNote';
import FolderIcon from '@mui/icons-material/Folder';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { buildApiUrl } from '../../config/api';

export default function Dashboard({ onNavigate }) {
  const [counts, setCounts] = useState({
    patients: 0,
    appointments: 0,
    documents: 0
  });
  const [loading, setLoading] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupToast, setBackupToast] = useState({ open: false, message: '', severity: 'info' });
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef(null);

  const formatElapsedTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
    }
    return `${secs}s`;
  };

  const handleDownloadBackup = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setBackupLoading(true);
    setElapsedSeconds(0);
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      const response = await fetch(buildApiUrl('/api/backup/download'));
      if (!response.ok) {
        let errorMsg = `Server error (${response.status})`;
        try {
          const errData = await response.json();
          if (errData?.error) errorMsg = errData.error;
        } catch {
          // Ignore JSON parse errors
        }
        throw new Error(errorMsg);
      }

      const blob = await response.blob();
      // Extract filename from Content-Disposition header, or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName = 'ZubaidaDiagnostics_Backup.zip';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
        if (match && match[1]) fileName = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setBackupToast({ open: true, message: 'Backup downloaded successfully!', severity: 'success' });
    } catch (err) {
      console.error('Backup download error:', err);
      setBackupToast({ open: true, message: err.message || 'Failed to download backup.', severity: 'error' });
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setBackupLoading(false);
    }
  };

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
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const statCards = [
    {
      title: 'Total Patients',
      count: counts.patients,
      icon: <PeopleIcon sx={{ fontSize: 28, color: 'var(--text)' }} />,
      pageId: 'patients'
    },
    {
      title: 'Total Appointments',
      count: counts.appointments,
      icon: <EventNoteIcon sx={{ fontSize: 28, color: 'var(--text)' }} />,
      pageId: 'appointments'
    },
    {
      title: 'Total Documents',
      count: counts.documents,
      icon: <FolderIcon sx={{ fontSize: 28, color: 'var(--text)' }} />,
      pageId: 'documents'
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
            onClick={() => onNavigate && onNavigate(stat.pageId)}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '15px',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              cursor: 'pointer',
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

      {/* Download Backup Button */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
        <Button
          variant="contained"
          onClick={handleDownloadBackup}
          disabled={backupLoading}
          startIcon={backupLoading ? <CircularProgress size={20} sx={{ color: 'inherit' }} /> : <CloudDownloadIcon />}
        >
          {backupLoading ? 'Preparing Backup...' : 'Download Backup'}
        </Button>

        {backupLoading && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mt: 1.5,
              px: 2,
              py: 0.75,
              borderRadius: '8px',
              background: 'hsla(221, 83%, 53%, 0.08)',
              border: '1px solid hsla(221, 83%, 53%, 0.2)',
            }}
          >
            <AccessTimeIcon sx={{ fontSize: 18, color: 'hsl(221, 83%, 53%)' }} />
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'Georgia, serif',
                fontWeight: 600,
                color: 'hsl(222, 47%, 11%)',
                fontSize: '13px',
              }}
            >
              Time Elapsed: {formatElapsedTime(elapsedSeconds)}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'hsl(215, 16%, 47%)',
                fontSize: '12px',
              }}
            >
              (Packing Database & Patient Files...)
            </Typography>
          </Box>
        )}
      </Box>

      {/* Backup Toast */}
      <Snackbar
        open={backupToast.open}
        autoHideDuration={6000}
        onClose={() => setBackupToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setBackupToast(prev => ({ ...prev, open: false }))}
          severity={backupToast.severity}
          variant="filled"
          sx={{
            width: '100%',
            fontWeight: 500,
            background: backupToast.severity === 'error'
              ? 'hsl(0, 72%, 40%)'
              : backupToast.severity === 'success'
                ? 'hsl(142, 70%, 30%)'
                : 'hsl(221, 83%, 40%)',
            color: 'hsl(0, 0%, 100%)'
          }}
        >
          {backupToast.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
