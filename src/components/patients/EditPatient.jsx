import { useState } from 'react';
import { Button, Snackbar, Alert, CircularProgress } from '@mui/material';
import { Badge, Person, SupervisorAccount, CalendarToday, Cake, Phone, Email } from '@mui/icons-material';
import '../../styles/Auth.css';

export default function EditPatient({ record, onBack, onSave }) {
  const [formData, setFormData] = useState(() => {
    const { id, mrNumber, name, fatherName, motherName, dateOfBirth, age, phone, email } = record;
    return { id, mrNumber, name, fatherName, motherName, dateOfBirth, age, phone, email };
  });

  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);

  const handleCloseToast = (event, reason) => {
    if (reason === 'clickaway') return;
    setToast(prev => ({ ...prev, open: false }));
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const parsedAge = parseInt(formData.age, 10);
    try {
      const response = await fetch(`/api/patients/${formData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          dateOfBirth: formData.dateOfBirth,
          age: isNaN(parsedAge) ? null : parsedAge,
        })
      });
      if (response.ok) {
        const savedRecord = await response.json();
        setToast({ open: true, message: 'Patient updated successfully!', severity: 'success' });
        onSave(savedRecord);
      } else {
        setToast({ open: true, message: 'Failed to update record', severity: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ open: true, message: 'Error updating record', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Edit Patient Record</h2>
        
        <div className="input-group">
          <label className="input-label" htmlFor="mrNumber">MR Number</label>
          <div className="input-with-icon">
            <Badge className="input-icon" />
            <input id="mrNumber" name="mrNumber" value={formData.mrNumber || ''} onChange={handleChange} disabled />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="name">Name</label>
          <div className="input-with-icon">
            <Person className="input-icon" />
            <input id="name" name="name" value={formData.name || ''} onChange={handleChange} disabled={loading} />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="fatherName">Father Name</label>
          <div className="input-with-icon">
            <SupervisorAccount className="input-icon" />
            <input id="fatherName" name="fatherName" value={formData.fatherName || ''} onChange={handleChange} disabled={loading} />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="motherName">Mother Name</label>
          <div className="input-with-icon">
            <Person className="input-icon" />
            <input id="motherName" name="motherName" value={formData.motherName || ''} onChange={handleChange} disabled={loading} />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="dateOfBirth">Date of Birth</label>
          <div className="input-with-icon">
            <CalendarToday className="input-icon" />
            <input id="dateOfBirth" name="dateOfBirth" type="date" value={formData.dateOfBirth ? formData.dateOfBirth.split('T')[0] : ''} onChange={handleChange} disabled={loading} />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="age">Age</label>
          <div className="input-with-icon">
            <Cake className="input-icon" />
            <input id="age" name="age" type="number" value={formData.age || ''} onChange={handleChange} disabled={loading} />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="phone">Phone</label>
          <div className="input-with-icon">
            <Phone className="input-icon" />
            <input id="phone" name="phone" value={formData.phone || ''} onChange={handleChange} disabled={loading} />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="email">Email</label>
          <div className="input-with-icon">
            <Email className="input-icon" />
            <input id="email" name="email" type="email" value={formData.email || ''} onChange={handleChange} disabled={loading} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '10px', width: '100%' }}>
          <Button variant="contained" fullWidth onClick={onBack} disabled={loading}>Cancel</Button>
          <Button variant="contained" fullWidth type="submit" disabled={loading} sx={{ gap: 1 }}>
            {loading ? (
              <>
                <CircularProgress size={20} color="inherit" />
                Saving...
              </>
            ) : (
              'Save'
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
