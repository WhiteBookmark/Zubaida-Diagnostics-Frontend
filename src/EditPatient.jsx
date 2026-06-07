import { useState } from 'react';
import './Auth.css';

export default function EditPatient({ record, onBack, onSave }) {
  const [formData, setFormData] = useState({ ...record });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    // For simplicity, storing the file name. 
    // In a real app, this would be an API call to upload the file.
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, scans: e.target.files[0].name });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="auth-container">
      <h2>Edit Patient Record</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <input name="mrNumber" placeholder="MR Number" value={formData.mrNumber} onChange={handleChange} disabled />
        <input name="name" placeholder="Name" value={formData.name} onChange={handleChange} />
        <input name="fatherName" placeholder="Father Name" value={formData.fatherName} onChange={handleChange} />
        <input name="motherName" placeholder="Mother Name" value={formData.motherName} onChange={handleChange} />
        <input name="dob" type="date" placeholder="Date of Birth" value={formData.dob} onChange={handleChange} />
        <input name="age" type="number" placeholder="Age" value={formData.age} onChange={handleChange} />
        <input name="address" placeholder="Address" value={formData.address} onChange={handleChange} />
        <div style={{ marginTop: '1rem' }}>
          <label>Scans: </label>
          <input type="file" onChange={handleFileChange} />
          <p>Current: {formData.scans}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button type="button" onClick={onBack}>Cancel</button>
          <button type="submit">Save</button>
        </div>
      </form>
    </div>
  );
}
