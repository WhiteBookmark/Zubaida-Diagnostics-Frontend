import { useState } from 'react';
import { mockData } from '../../utils/mockData';
import { Box, Button, TextField, Select, MenuItem, InputLabel, FormControl, Snackbar, Alert } from '@mui/material';
import '../../styles/Auth.css';

export default function AddPatient({ onBack, onAdd }) {
  const [formData, setFormData] = useState({
    name: '',
    fatherName: '',
    motherName: '',
    dob: '',
    age: '',
    phone: '',
    email: '',
  });

  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const handleCloseToast = (event, reason) => {
    if (reason === 'clickaway') return;
    setToast(prev => ({ ...prev, open: false }));
  };

  const fillRandomData = () => {
    const randomPatient = mockData[Math.floor(Math.random() * mockData.length)];
    setFormData({
      ...formData,
      name: randomPatient.name,
      fatherName: randomPatient.fatherName,
      motherName: randomPatient.motherName,
      dob: randomPatient.dob,
      age: randomPatient.age.toString(),
      phone: '555-' + Math.floor(1000 + Math.random() * 9000),
      email: randomPatient.name.toLowerCase().replace(' ', '.') + '@example.com',
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };

    if (name === 'dob' && value) {
      const birthDate = new Date(value);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      newFormData.age = age >= 0 ? age.toString() : '';
    }

    setFormData(newFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          fatherName: formData.fatherName,
          motherName: formData.motherName,
          dateOfBirth: formData.dob,
          age: parseInt(formData.age),
          phone: formData.phone,
          email: formData.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create patient');
      }

      const newPatient = await response.json();
      setToast({ open: true, message: 'Patient added successfully!', severity: 'success' });
      setTimeout(() => onAdd(newPatient), 1500);
    } catch (error) {
      console.error(error);
      setToast({ open: true, message: 'Error creating patient: ' + error.message, severity: 'error' });
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Add New Patient Record</h2>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>Name</label>
          <input name="name" value={formData.name} onChange={handleChange} autoFocus required />
        </div>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>Father Name</label>
          <input name="fatherName" value={formData.fatherName} onChange={handleChange} />
        </div>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>Mother Name</label>
          <input name="motherName" value={formData.motherName} onChange={handleChange} />
        </div>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>Date of Birth</label>
          <input name="dob" type="date" value={formData.dob} onChange={handleChange} />
        </div>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>Age</label>
          <input name="age" type="number" value={formData.age} onChange={handleChange} />
        </div>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>Phone</label>
          <input name="phone" value={formData.phone} onChange={handleChange} />
        </div>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>Email</label>
          <input name="email" type="email" value={formData.email} onChange={handleChange} />
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '10px', width: '100%' }}>
          <Button variant="contained" fullWidth onClick={onBack}>Cancel</Button>
          {import.meta.env.DEV && (
            <Button variant="contained" fullWidth onClick={fillRandomData}>Fill Random Data</Button>
          )}
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
