import { useState } from 'react';
import { Button } from '@mui/material';
import './Auth.css';

export default function AddAppointmentRecord({ onBack, onAdd }) {
  const [formData, setFormData] = useState({
    mrNumber: '',
    dateTime: '',
    amountPaid: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const patientRes = await fetch(`/api/patients?search=${formData.mrNumber}`);
      const patientData = await patientRes.json();
      
      if (!patientData.data || patientData.data.length === 0) {
        alert('Patient not found with this MR Number');
        return;
      }

      const patient = patientData.data[0];
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          dateTime: formData.dateTime,
          amountPaid: formData.amountPaid,
        }),
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
      <form onSubmit={handleSubmit} className="auth-form" autoComplete="off">
        <h2>Add New Appointment Record</h2>
        <input name="mrNumber" type="text" value={formData.mrNumber} placeholder="MR Number" onChange={handleChange} required autoComplete="off" />
        <input name="dateTime" type="datetime-local" value={formData.dateTime} onChange={handleChange} required autoComplete="off" />
        <input name="amountPaid" type="number" step="0.01" value={formData.amountPaid} placeholder="Amount Paid" onChange={handleChange} autoComplete="off" />
        <div style={{ display: 'flex', gap: '1rem', marginTop: '10px', width: '100%' }}>
          <Button variant="contained" fullWidth onClick={onBack}>Cancel</Button>
          <Button variant="contained" fullWidth type="submit">Add</Button>
        </div>
      </form>
    </div>
  );
}
