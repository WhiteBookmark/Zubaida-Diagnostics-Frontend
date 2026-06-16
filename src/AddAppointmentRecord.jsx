import { useState, useEffect } from 'react';
import { Button } from '@mui/material';
import './Auth.css';

export default function AddAppointmentRecord({ onBack, onAdd }) {
  const [patients, setPatients] = useState([]);
  const [formData, setFormData] = useState({
    patientId: '',
    dateTime: '',
    reason: '',
    tokenNumber: '',
    amountPaid: '',
    notes: '',
  });

  useEffect(() => {
    fetch('/api/patients?limit=1000')
      .then(res => res.json())
      .then(result => {
        if (result && result.data) {
          setPatients(result.data);
        }
      })
      .catch(console.error);
  }, []);

  const fillRandomData = () => {
    const randomPatient = patients[Math.floor(Math.random() * patients.length)];
    setFormData({
      patientId: randomPatient ? randomPatient.id : '',
      dateTime: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      reason: 'Routine Checkup',
      tokenNumber: Math.floor(Math.random() * 100) + 1,
      amountPaid: (Math.random() * 500 + 100).toFixed(2),
      notes: 'Auto-filled test data.',
    });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        const newRecord = await response.json();
        onAdd(newRecord);
      } else {
        const errorData = await response.json();
        alert(`Failed to add appointment: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding appointment:', error);
      alert('Error adding appointment: ' + error.message);
    }
  };

  return (
    <div className="auth-container">
      <h2>Add New Appointment Record</h2>
      <form onSubmit={handleSubmit} className="auth-form" autoComplete="off">
        <select name="patientId" value={formData.patientId} onChange={handleChange} required>
          <option value="">Select Patient</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input name="dateTime" type="datetime-local" value={formData.dateTime} onChange={handleChange} required autoComplete="off" />
        <input name="reason" value={formData.reason} placeholder="Reason" onChange={handleChange} autoComplete="off" />
        <input name="tokenNumber" type="number" value={formData.tokenNumber} placeholder="Token Number" onChange={handleChange} autoComplete="off" />
        <input name="amountPaid" type="number" step="0.01" value={formData.amountPaid} placeholder="Amount Paid" onChange={handleChange} autoComplete="off" />
        <input name="notes" value={formData.notes} placeholder="Notes" onChange={handleChange} autoComplete="off" />
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
