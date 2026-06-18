import { useState } from 'react';
import { Button, Snackbar, Alert } from '@mui/material';
import './Auth.css';

export default function AddDocument({ onBack, onSave }) {
  const [formData, setFormData] = useState({
    mrNumber: '',
    type: '',
  });
  const [file, setFile] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const handleCloseToast = (event, reason) => {
    if (reason === 'clickaway') return;
    setToast(prev => ({ ...prev, open: false }));
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !formData.mrNumber) {
      setToast({ open: true, message: 'Please enter an MR Number and select a file.', severity: 'error' });
      return;
    }

    const data = new FormData();
    data.append('file', file);
    data.append('type', formData.type);

    try {
      const response = await fetch(`/api/uploads/${formData.mrNumber}/documents`, {
        method: 'POST',
        body: data,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload document');
      }

      setToast({ open: true, message: 'Document uploaded successfully!', severity: 'success' });
      setTimeout(() => onSave(), 1500); // Navigate back or refresh
    } catch (error) {
      console.error(error);
      setToast({ open: true, message: 'Error uploading document: ' + error.message, severity: 'error' });
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Add New Document</h2>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>MR Number</label>
          <input name="mrNumber" value={formData.mrNumber} onChange={handleChange} required />
        </div>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>Document Type</label>
          <input name="type" value={formData.type} onChange={handleChange} required />
        </div>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>File</label>
          <input type="file" onChange={handleFileChange} required />
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '10px', width: '100%' }}>
          <Button variant="contained" fullWidth onClick={onBack}>Cancel</Button>
          <Button variant="contained" fullWidth type="submit">Upload</Button>
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
