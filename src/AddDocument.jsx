import { useState, useEffect } from 'react';
import { Button } from '@mui/material';
import './Auth.css';

export default function AddDocument({ onBack, onSave }) {
  const [patients, setPatients] = useState([]);
  const [formData, setFormData] = useState({
    patientId: '',
    type: '',
    notes: '',
  });
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetch('/api/patients')
      .then(res => res.json())
      .then(data => {
        // Handle both object with data property and array directly
        const patientList = data.data || data;
        setPatients(patientList);
      })
      .catch(console.error);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !formData.patientId) {
      alert('Please select a patient and a file.');
      return;
    }

    const data = new FormData();
    data.append('file', file);
    data.append('type', formData.type);
    data.append('notes', formData.notes);

    try {
      const response = await fetch(`/api/uploads/${formData.patientId}/documents`, {
        method: 'POST',
        body: data,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload document');
      }

      alert('Document uploaded successfully!');
      onSave(); // Navigate back or refresh
    } catch (error) {
      console.error(error);
      alert('Error uploading document: ' + error.message);
    }
  };

  return (
    <div className="auth-container">
      <h2>Add New Document</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <select name="patientId" value={formData.patientId} onChange={handleChange} required>
          <option value="">Select Patient</option>
          {patients.map(patient => (
            <option key={patient.id} value={patient.id}>
              {patient.mrNumber} - {patient.name}
            </option>
          ))}
        </select>
        <input name="type" value={formData.type} placeholder="Document Type (e.g. Lab Report)" onChange={handleChange} required />
        <input name="notes" value={formData.notes} placeholder="Notes" onChange={handleChange} />
        <input type="file" onChange={handleFileChange} required />
        <div style={{ display: 'flex', gap: '1rem', marginTop: '10px', width: '100%' }}>
          <Button variant="contained" fullWidth onClick={onBack}>Cancel</Button>
          <Button variant="contained" fullWidth type="submit">Upload</Button>
        </div>
      </form>
    </div>
  );
}
