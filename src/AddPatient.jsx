import { useState } from 'react';
import { mockData } from './mockData';
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
    email: '',
    bloodGroup: '',
    knownAllergies: '',
    notes: '',
    smoker: false,
  });

  const fillRandomData = () => {
    const randomPatient = mockData[Math.floor(Math.random() * mockData.length)];
    setFormData({
      ...formData,
      mrNumber: randomPatient.mrNumber,
      name: randomPatient.name,
      fatherName: randomPatient.fatherName,
      motherName: randomPatient.motherName,
      dob: randomPatient.dob,
      age: randomPatient.age.toString(),
      address: randomPatient.address,
      phone: '555-' + Math.floor(1000 + Math.random() * 9000),
      email: randomPatient.name.toLowerCase().replace(' ', '.') + '@example.com',
      bloodGroup: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'][Math.floor(Math.random() * 8)],
      knownAllergies: 'None',
      notes: 'Auto-filled test data.',
      smoker: Math.random() > 0.5
    });
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
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
          phone: formData.phone,
          email: formData.email,
          bloodGroup: formData.bloodGroup,
          knownAllergies: formData.knownAllergies,
          notes: formData.notes,
          smoker: formData.smoker
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
        <input name="mrNumber" value={formData.mrNumber} placeholder="MR Number" onChange={handleChange} required />
        <input name="name" value={formData.name} placeholder="Name" onChange={handleChange} required />
        <input name="fatherName" value={formData.fatherName} placeholder="Father Name" onChange={handleChange} />
        <input name="motherName" value={formData.motherName} placeholder="Mother Name" onChange={handleChange} />
        <input name="dob" type="date" value={formData.dob} placeholder="Date of Birth" onChange={handleChange} />
        <input name="age" type="number" value={formData.age} placeholder="Age" onChange={handleChange} />
        <input name="address" value={formData.address} placeholder="Address" onChange={handleChange} />
        <input name="phone" value={formData.phone} placeholder="Phone" onChange={handleChange} />
        <input name="email" type="email" value={formData.email} placeholder="Email" onChange={handleChange} />
        <input name="bloodGroup" value={formData.bloodGroup} placeholder="Blood Group" onChange={handleChange} />
        <input name="knownAllergies" value={formData.knownAllergies} placeholder="Known Allergies" onChange={handleChange} />
        <input name="notes" value={formData.notes} placeholder="Notes" onChange={handleChange} />
        <label>
          <input name="smoker" type="checkbox" checked={formData.smoker} onChange={handleChange} />
          Smoker
        </label>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="button" onClick={onBack}>Cancel</button>
          <button type="button" onClick={fillRandomData}>Fill Random Data</button>
          <button type="submit">Add</button>
        </div>
      </form>
    </div>
  );
}
