import { useState } from 'react';
import { Button } from '@mui/material';
import './Auth.css';

export default function AddDocument({ onBack, onSave }) {
  const [formData, setFormData] = useState({
    mrNumber: '',
    type: '',
  });
  const [file, setFile] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !formData.mrNumber) {
      alert('Please enter an MR Number and select a file.');
      return;
    }

    const data = new FormData();
    data.append('file', file);
    data.append('type', formData.type);

    try {
      const response = await fetch(`/api/uploads/${formData.mrNumber}/documents`, {
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
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Add New Document</h2>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>MR Number</label>
          <input name="mrNumber" value={formData.mrNumber} placeholder="MR Number" onChange={handleChange} required />
        </div>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>Document Type</label>
          <input name="type" value={formData.type} placeholder="Document Type (e.g. Lab Report)" onChange={handleChange} required />
        </div>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>File</label>
          <input type="file" onChange={handleFileChange} required />
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '10px', width: '100%' }}>
          <Button variant="contained" fullWidth onClick={onBack}>Cancel</Button>
          <Button variant="contained" fullWidth type="submit">Upload</Button>
        </div>
      </form>
    </div>
  );
}
