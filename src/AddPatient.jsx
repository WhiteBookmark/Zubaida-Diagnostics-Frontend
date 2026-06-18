import { useState } from 'react';
import { mockData } from './mockData';
import { Button } from '@mui/material';
import './Auth.css';

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
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
      onAdd(newPatient);
    } catch (error) {
      console.error(error);
      alert('Error creating patient: ' + error.message);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Add New Patient Record</h2>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>Name</label>
          <input name="name" value={formData.name} onChange={handleChange} required />
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
    </div>
  );
}
