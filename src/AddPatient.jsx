import { useState } from 'react';
import './Auth.css';

export default function AddPatient({ onBack, onAdd }) {
  const [formData, setFormData] = useState({
    mrNumber: '',
    name: '',
    fatherName: '',
    motherName: '',
    dob: '',
    age: '',
    address: '',
    phone: '',
  });

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
          mrNumber: formData.mrNumber,
          name: formData.name,
          fatherName: formData.fatherName,
          motherName: formData.motherName,
          dateOfBirth: formData.dob,
          age: parseInt(formData.age),
          address: formData.address,
          phone: formData.phone
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
        <input name="mrNumber" placeholder="MR Number" onChange={handleChange} required />
        <input name="name" placeholder="Name" onChange={handleChange} required />
        <input name="fatherName" placeholder="Father Name" onChange={handleChange} />
        <input name="motherName" placeholder="Mother Name" onChange={handleChange} />
        <input name="dob" type="date" placeholder="Date of Birth" onChange={handleChange} />
        <input name="age" type="number" placeholder="Age" onChange={handleChange} />
        <input name="address" placeholder="Address" onChange={handleChange} />
        <input name="phone" placeholder="Phone" onChange={handleChange} />
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="button" onClick={onBack}>Cancel</button>
          <button type="submit">Add</button>
        </div>
      </form>
    </div>
  );
}
