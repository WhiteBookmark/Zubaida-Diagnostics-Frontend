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
    scans: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(formData);
  };

  return (
    <div className="auth-container">
      <h2>Add New Patient Record</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <input name="mrNumber" placeholder="MR Number" onChange={handleChange} />
        <input name="name" placeholder="Name" onChange={handleChange} />
        <input name="fatherName" placeholder="Father Name" onChange={handleChange} />
        <input name="motherName" placeholder="Mother Name" onChange={handleChange} />
        <input name="dob" type="date" placeholder="Date of Birth" onChange={handleChange} />
        <input name="age" type="number" placeholder="Age" onChange={handleChange} />
        <input name="address" placeholder="Address" onChange={handleChange} />
        <input name="scans" placeholder="Scans" onChange={handleChange} />
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="button" onClick={onBack}>Cancel</button>
          <button type="submit">Add</button>
        </div>
      </form>
    </div>
  );
}
