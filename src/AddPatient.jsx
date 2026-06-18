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
      <h2>Add New Patient Record</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <input name="name" value={formData.name} placeholder="Name" onChange={handleChange} required />
        <input name="fatherName" value={formData.fatherName} placeholder="Father Name" onChange={handleChange} />
        <input name="motherName" value={formData.motherName} placeholder="Mother Name" onChange={handleChange} />
        <input name="dob" type="date" value={formData.dob} placeholder="Date of Birth" onChange={handleChange} />
        <input name="age" type="number" value={formData.age} placeholder="Age" onChange={handleChange} />
        <input name="phone" value={formData.phone} placeholder="Phone" onChange={handleChange} />
        <input name="email" type="email" value={formData.email} placeholder="Email" onChange={handleChange} />
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
