import { useState } from 'react';
import { Button, Snackbar, Alert } from '@mui/material';
import '../../styles/Auth.css';

export default function EditPatient({ record, onBack, onSave }) {
  const [formData, setFormData] = useState(() => {
    const { id, mrNumber, name, fatherName, motherName, dateOfBirth, age, phone, email } = record;
    return { id, mrNumber, name, fatherName, motherName, dateOfBirth, age, phone, email };
  });

  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const handleCloseToast = (event, reason) => {
    if (reason === 'clickaway') return;
    setToast(prev => ({ ...prev, open: false }));
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/patients/${formData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          dateOfBirth: formData.dateOfBirth,
          age: parseInt(formData.age),
        })
      });
      if (response.ok) {
        const savedRecord = await response.json();
        setToast({ open: true, message: 'Patient updated successfully!', severity: 'success' });
        onSave(savedRecord);
      } else {
        setToast({ open: true, message: 'Failed to update record', severity: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ open: true, message: 'Error updating record', severity: 'error' });
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Edit Patient Record</h2>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>MR Number</label>
          <input name="mrNumber" value={formData.mrNumber || ''} onChange={handleChange} disabled />
        </div>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>Name</label>
          <input name="name" value={formData.name || ''} onChange={handleChange} />
        </div>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>Father Name</label>
          <input name="fatherName" value={formData.fatherName || ''} onChange={handleChange} />
        </div>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>Mother Name</label>
          <input name="motherName" value={formData.motherName || ''} onChange={handleChange} />
        </div>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>Date of Birth</label>
          <input name="dateOfBirth" type="date" value={formData.dateOfBirth ? formData.dateOfBirth.split('T')[0] : ''} onChange={handleChange} />
        </div>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>Age</label>
          <input name="age" type="number" value={formData.age || ''} onChange={handleChange} />
        </div>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>Phone</label>
          <input name="phone" value={formData.phone || ''} onChange={handleChange} />
        </div>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>Email</label>
          <input name="email" type="email" value={formData.email || ''} onChange={handleChange} />
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '10px', width: '100%' }}>
          <Button variant="contained" fullWidth onClick={onBack}>Cancel</Button>
          <Button variant="contained" fullWidth type="submit">Save</Button>
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
