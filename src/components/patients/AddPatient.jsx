import { useState } from 'react';
import { mockData } from '../../utils/mockData';
import { Button, Snackbar, Alert, CircularProgress } from '@mui/material';
import { Person, SupervisorAccount, CalendarToday, Cake, Phone, Email } from '@mui/icons-material';
import '../../styles/Auth.css';

export default function AddPatient({ onBack, onAdd }) {
  const [formData, setFormData] = useState({
    name: '',
    fatherName: '',
    motherName: '',
    dob: '',
    age: '',
    ageMonths: 0,
    phone: '',
    email: '',
  });

  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);

  const handleCloseToast = (event, reason) => {
    if (reason === 'clickaway') return;
    setToast(prev => ({ ...prev, open: false }));
  };

  const fillRandomData = () => {
    const randomPatient = mockData[Math.floor(Math.random() * mockData.length)];
    setFormData({
      ...formData,
      name: randomPatient.name,
      fatherName: randomPatient.fatherName,
      motherName: randomPatient.motherName,
      dob: randomPatient.dob,
      age: randomPatient.age.toString(),
      ageMonths: Math.floor(Math.random() * 12),
      phone: '555-' + Math.floor(1000 + Math.random() * 9000),
      email: randomPatient.name.toLowerCase().replace(' ', '.') + '@example.com',
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };

    if (name === 'dob' && value) {
      const birthDate = new Date(value);
      const today = new Date();
      let ageYears = today.getFullYear() - birthDate.getFullYear();
      let m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        ageYears--;
        m += 12;
      }
      if (today.getDate() < birthDate.getDate() && m > 0) {
        m--;
      }
      newFormData.age = ageYears >= 0 ? ageYears.toString() : '';
      newFormData.ageMonths = ageYears >= 0 ? m : 0;
    }

    setFormData(newFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const parsedAge = parseInt(formData.age, 10);
    const parsedAgeMonths = parseInt(formData.ageMonths, 10);
    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: String(formData.name ?? '').trim(),
          fatherName: String(formData.fatherName ?? '').trim(),
          motherName: String(formData.motherName ?? '').trim(),
          dateOfBirth: formData.dob,
          age: isNaN(parsedAge) ? null : parsedAge,
          ageMonths: isNaN(parsedAgeMonths) ? 0 : parsedAgeMonths,
          phone: String(formData.phone ?? '').trim(),
          email: String(formData.email ?? '').trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create patient');
      }

      const newPatient = await response.json();
      onAdd(newPatient, 'Patient added successfully!');
    } catch (error) {
      console.error(error);
      setToast({ open: true, message: 'Error creating patient: ' + error.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Add New Patient Record</h2>
        
        <div className="input-group">
          <label className="input-label" htmlFor="name">Name</label>
          <div className="input-with-icon">
            <Person className="input-icon" />
            <input id="name" name="name" value={formData.name} onChange={handleChange} autoFocus required disabled={loading} />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="fatherName">Father Name</label>
          <div className="input-with-icon">
            <SupervisorAccount className="input-icon" />
            <input id="fatherName" name="fatherName" value={formData.fatherName} onChange={handleChange} disabled={loading} />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="motherName">Mother Name</label>
          <div className="input-with-icon">
            <Person className="input-icon" />
            <input id="motherName" name="motherName" value={formData.motherName} onChange={handleChange} disabled={loading} />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="dob">Date of Birth</label>
          <div className="input-with-icon">
            <CalendarToday className="input-icon" />
            <input id="dob" name="dob" type="date" max={todayStr} value={formData.dob} onChange={handleChange} disabled={loading} />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="age">Age (Years & Months)</label>
          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
            <div className="input-with-icon" style={{ flex: 1 }}>
              <Cake className="input-icon" />
              <input 
                id="age" 
                name="age" 
                type="number" 
                min="0" 
                max="150" 
                step="1" 
                placeholder="Years" 
                value={formData.age} 
                onChange={handleChange} 
                disabled={loading} 
              />
            </div>
            <div className="input-with-icon" style={{ flex: 1 }}>
              <Cake className="input-icon" />
              <select 
                id="ageMonths" 
                name="ageMonths" 
                value={formData.ageMonths} 
                onChange={handleChange} 
                disabled={loading}
              >
                {[...Array(13).keys()].map(m => (
                  <option key={m} value={m}>{m} {m === 1 ? 'Month' : 'Months'}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="phone">Phone</label>
          <div className="input-with-icon">
            <Phone className="input-icon" />
            <input id="phone" name="phone" type="tel" pattern="[0-9+() -]{7,20}" maxLength="20" title="Enter a valid phone number" value={formData.phone} onChange={handleChange} disabled={loading} />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="email">Email</label>
          <div className="input-with-icon">
            <Email className="input-icon" />
            <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} disabled={loading} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '10px', width: '100%' }}>
          <Button variant="contained" fullWidth onClick={onBack} disabled={loading}>Cancel</Button>
          {import.meta.env.DEV && (
            <Button variant="contained" fullWidth onClick={fillRandomData} disabled={loading}>Fill Random Data</Button>
          )}
          <Button variant="contained" fullWidth type="submit" disabled={loading} sx={{ gap: 1 }}>
            {loading ? (
              <>
                <CircularProgress size={20} color="inherit" />
                Adding...
              </>
            ) : (
              'Add'
            )}
          </Button>
        </div>
      </form>
      <Snackbar 
        open={toast.open} 
        autoHideDuration={6000} 
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseToast} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
