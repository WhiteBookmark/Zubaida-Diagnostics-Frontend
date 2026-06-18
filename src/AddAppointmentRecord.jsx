import { useState, useRef, useEffect } from 'react';
import { Button, Snackbar, Alert } from '@mui/material';
import './Auth.css';

export default function AddAppointmentRecord({ onBack, onAdd, initialMrNumber = '' }) {
  const [formData, setFormData] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return {
      mrNumber: initialMrNumber,
      dateTime: `${year}-${month}-${day}T${hours}:${minutes}`,
      amountPaid: '',
    };
  });

  const amountPaidRef = useRef(null);

  useEffect(() => {
    if (amountPaidRef.current) {
      amountPaidRef.current.focus();
    }
  }, []);

  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const handleCloseToast = (event, reason) => {
    if (reason === 'clickaway') return;
    setToast(prev => ({ ...prev, open: false }));
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const patientRes = await fetch(`/api/patients?search=${formData.mrNumber}`);
      const patientData = await patientRes.json();
      
      if (!patientData.data || patientData.data.length === 0) {
        setToast({ open: true, message: 'Patient not found with this MR Number', severity: 'error' });
        return;
      }

      const patient = patientData.data[0];
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          dateTime: formData.dateTime,
          amountPaid: formData.amountPaid,
        }),
      });
      if (response.ok) {
        const newRecord = await response.json();
        setToast({ open: true, message: `Appointment added successfully! Token Number: ${newRecord.tokenNumber}`, severity: 'success' });
        setTimeout(() => onAdd(newRecord), 1500);
      } else {
        const errorData = await response.json();
        setToast({ open: true, message: `Failed to add appointment: ${errorData.error || 'Unknown error'}`, severity: 'error' });
      }
    } catch (error) {
      console.error('Error adding appointment:', error);
      setToast({ open: true, message: 'Error adding appointment: ' + error.message, severity: 'error' });
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form" autoComplete="off">
        <h2>Add New Appointment Record</h2>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>MR Number</label>
          <input name="mrNumber" type="text" value={formData.mrNumber} onChange={handleChange} required autoComplete="off" />
        </div>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>Date & Time</label>
          <input name="dateTime" type="datetime-local" value={formData.dateTime} onChange={handleChange} required autoComplete="off" />
        </div>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>Amount Paid</label>
          <input name="amountPaid" type="number" step="0.01" value={formData.amountPaid} onChange={handleChange} autoComplete="off" ref={amountPaidRef} />
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '10px', width: '100%' }}>
          <Button variant="contained" fullWidth onClick={onBack}>Cancel</Button>
          <Button variant="contained" fullWidth type="submit">Add</Button>
        </div>
      </form>
      <Snackbar 
        open={toast.open} 
        autoHideDuration={6000} 
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseToast} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
