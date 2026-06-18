import { useState } from 'react';
import { Button } from '@mui/material';
import './Auth.css';

export default function EditPatient({ record, onBack, onSave }) {
  const [formData, setFormData] = useState(() => {
    const { mrNumber, name, fatherName, motherName, dateOfBirth, age, phone, email } = record;
    return { mrNumber, name, fatherName, motherName, dateOfBirth, age, phone, email };
  });

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
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
    </div>
  );
}
