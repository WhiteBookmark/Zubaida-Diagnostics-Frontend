import { useState } from 'react';
import './Auth.css';

export default function EditPatient({ record, onBack, onSave }) {
  const [formData, setFormData] = useState({ ...record, smoker: !!record.smoker });

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => file.name);
      // Assuming scans is stored as an array of strings
      const currentScans = Array.isArray(formData.scans) ? formData.scans : (formData.scans ? [formData.scans] : []);
      setFormData({ ...formData, scans: [...currentScans, ...newFiles] });
    }
  };

  const removeFile = (index) => {
    setFormData({
      ...formData,
      scans: formData.scans.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="auth-container">
      <h2>Edit Patient Record</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <input name="mrNumber" placeholder="MR Number" value={formData.mrNumber || ''} onChange={handleChange} disabled />
        <input name="name" placeholder="Name" value={formData.name || ''} onChange={handleChange} />
        <input name="fatherName" placeholder="Father Name" value={formData.fatherName || ''} onChange={handleChange} />
        <input name="motherName" placeholder="Mother Name" value={formData.motherName || ''} onChange={handleChange} />
        <input name="dateOfBirth" type="date" placeholder="Date of Birth" value={formData.dateOfBirth ? formData.dateOfBirth.split('T')[0] : ''} onChange={handleChange} />
        <input name="age" type="number" placeholder="Age" value={formData.age || ''} onChange={handleChange} />
        <input name="address" placeholder="Address" value={formData.address || ''} onChange={handleChange} />
        <input name="phone" placeholder="Phone" value={formData.phone || ''} onChange={handleChange} />
        <input name="email" type="email" placeholder="Email" value={formData.email || ''} onChange={handleChange} />
        <input name="bloodGroup" placeholder="Blood Group" value={formData.bloodGroup || ''} onChange={handleChange} />
        <input name="knownAllergies" placeholder="Known Allergies" value={formData.knownAllergies || ''} onChange={handleChange} />
        <input name="weight" type="number" step="0.1" placeholder="Weight (kg)" value={formData.weight || ''} onChange={handleChange} />
        <input name="height" type="number" step="0.1" placeholder="Height (cm)" value={formData.height || ''} onChange={handleChange} />
        <input name="notes" placeholder="Notes" value={formData.notes || ''} onChange={handleChange} />
        <label>
          <input name="smoker" type="checkbox" checked={formData.smoker} onChange={handleChange} />
          Smoker
        </label>
        <div style={{ marginTop: '1rem' }}>
          <label>Scans: </label>
          <input type="file" multiple onChange={handleFileChange} />
          <ul>
            {(Array.isArray(formData.scans) ? formData.scans : [formData.scans]).filter(Boolean).map((file, index) => (
              <li key={index}>
                {file} <button type="button" onClick={() => removeFile(index)}>Remove</button>
              </li>
            ))}
          </ul>
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button type="button" onClick={onBack}>Cancel</button>
          <button type="submit">Save</button>
        </div>
      </form>
    </div>
  );
}
