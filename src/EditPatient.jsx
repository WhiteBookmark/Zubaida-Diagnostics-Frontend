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
        <input name="mrNumber" placeholder="MR Number" value={formData.mrNumber || ''} onChange={handleChange} disabled />
        <input name="name" placeholder="Name" value={formData.name || ''} onChange={handleChange} />
        <input name="fatherName" placeholder="Father Name" value={formData.fatherName || ''} onChange={handleChange} />
        <input name="motherName" placeholder="Mother Name" value={formData.motherName || ''} onChange={handleChange} />
        <input name="dateOfBirth" type="date" placeholder="Date of Birth" value={formData.dateOfBirth ? formData.dateOfBirth.split('T')[0] : ''} onChange={handleChange} />
        <input name="age" type="number" placeholder="Age" value={formData.age || ''} onChange={handleChange} />
        <input name="phone" placeholder="Phone" value={formData.phone || ''} onChange={handleChange} />
        <input name="email" type="email" placeholder="Email" value={formData.email || ''} onChange={handleChange} />
        <div style={{ display: 'flex', gap: '1rem', marginTop: '10px', width: '100%' }}>
          <Button variant="contained" fullWidth onClick={onBack}>Cancel</Button>
          <Button variant="contained" fullWidth type="submit">Save</Button>
        </div>
      </form>
    </div>
  );
}
