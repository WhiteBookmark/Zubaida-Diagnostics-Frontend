import { useState, useEffect } from 'react';
import './Auth.css';

export default function AddVitalRecord({ onBack, onAdd }) {
  const [patients, setPatients] = useState([]);
  const [formData, setFormData] = useState({
    patientId: '',
    weight: '',
    height: '',
    notes: '',
  });

  useEffect(() => {
    fetch('/api/patients?limit=1000') // Fetch a large list to ensure we get all patients
      .then(res => res.json())
      .then(result => {
        if (result && result.data) {
          setPatients(result.data);
        }
      })
      .catch(console.error);
  }, []);

  const fillRandomData = () => {
    setFormData({
      patientId: patients.length > 0 ? patients[Math.floor(Math.random() * patients.length)].id : '',
      weight: (Math.random() * (100 - 40) + 40).toFixed(1),
      height: (Math.random() * (200 - 140) + 140).toFixed(1),
      notes: 'Auto-filled test data.',
    });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(formData);
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit}>
        <select name="patientId" value={formData.patientId} onChange={handleChange} required>
          <option value="">Select Patient</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input name="weight" type="number" step="0.1" value={formData.weight} placeholder="Weight (kg)" onChange={handleChange} />
        <input name="height" type="number" step="0.1" value={formData.height} placeholder="Height (cm)" onChange={handleChange} />
        <input name="notes" value={formData.notes} placeholder="Notes" onChange={handleChange} />
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="button" onClick={onBack}>Cancel</button>
          {import.meta.env.DEV && (
            <button type="button" onClick={fillRandomData}>Fill Random Data</button>
          )}
          <button type="submit">Add</button>
        </div>
      </form>
    </div>
  );
}
