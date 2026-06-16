import { useState, useEffect } from 'react';
import './Auth.css';

export default function AddVitalRecord({ onBack, onAdd }) {
  const [patients, setPatients] = useState([]);
  const [formData, setFormData] = useState({
    patientId: '',
    weight: '',
    height: '',
    bpSystolic: '',
    bpDiastolic: '',
    temperature: '',
    pulse: '',
    respiratoryRate: '',
    oxygenSaturation: '',
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
      bpSystolic: Math.floor(Math.random() * (140 - 100) + 100),
      bpDiastolic: Math.floor(Math.random() * (90 - 60) + 60),
      temperature: (Math.random() * (39 - 36) + 36).toFixed(1),
      pulse: Math.floor(Math.random() * (100 - 60) + 60),
      respiratoryRate: Math.floor(Math.random() * (20 - 12) + 12),
      oxygenSaturation: Math.floor(Math.random() * (100 - 95) + 95),
      notes: 'Auto-filled test data.',
    });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        const newRecord = await response.json();
        onAdd(newRecord);
      } else {
        const errorData = await response.json();
        alert(`Failed to add vital record: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding vital record:', error);
      alert('Error adding vital record: ' + error.message);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <select name="patientId" value={formData.patientId} onChange={handleChange} required>
          <option value="">Select Patient</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input name="weight" type="number" step="0.1" value={formData.weight} placeholder="Weight (kg)" onChange={handleChange} autoComplete="off" />
        <input name="height" type="number" step="0.1" value={formData.height} placeholder="Height (cm)" onChange={handleChange} autoComplete="off" />
        <input name="bpSystolic" type="number" value={formData.bpSystolic} placeholder="Blood Pressure Systolic" onChange={handleChange} autoComplete="off" />
        <input name="bpDiastolic" type="number" value={formData.bpDiastolic} placeholder="Blood Pressure Diastolic" onChange={handleChange} autoComplete="off" />
        <input name="temperature" type="number" step="0.1" value={formData.temperature} placeholder="Temperature (°C)" onChange={handleChange} autoComplete="off" />
        <input name="pulse" type="number" value={formData.pulse} placeholder="Pulse" onChange={handleChange} autoComplete="off" />
        <input name="respiratoryRate" type="number" value={formData.respiratoryRate} placeholder="Respiratory Rate" onChange={handleChange} autoComplete="off" />
        <input name="oxygenSaturation" type="number" value={formData.oxygenSaturation} placeholder="Oxygen Saturation (%)" onChange={handleChange} autoComplete="off" />
        <input name="notes" value={formData.notes} placeholder="Notes" onChange={handleChange} autoComplete="off" />
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
