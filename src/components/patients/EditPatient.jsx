import { useState } from 'react';
import { Button, IconButton, Snackbar, Alert, CircularProgress } from '@mui/material';
import { Badge, Person, SupervisorAccount, CalendarToday, Cake, Phone, Email, LocalHospital, MedicalServices, Close as CloseIcon } from '@mui/icons-material';
import { buildApiUrl } from '../../config/api';
import '../../styles/Auth.css';

export default function EditPatient({ record, onBack, onSave }) {
  const [formData, setFormData] = useState(() => {
    const { id, mrNumber, name, fatherName, motherName, husbandName, dateOfBirth, age, ageMonths, phone, email, fixedAllergies, coMorbidFactor } = record;
    return { id, mrNumber, name, fatherName, motherName, husbandName: husbandName || '', dateOfBirth, age, ageMonths: ageMonths ?? 0, phone, email, fixedAllergies: fixedAllergies || '', coMorbidFactor: coMorbidFactor || '' };
  });

  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);

  const handleCloseToast = (event, reason) => {
    if (reason === 'clickaway') return;
    setToast(prev => ({ ...prev, open: false }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    let newFormData = { ...formData, [name]: val };

    if (name === 'dateOfBirth' && val) {
      const birthDate = new Date(val);
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
      const response = await fetch(buildApiUrl(`/api/patients/${formData.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          name: String(formData.name ?? '').trim(),
          fatherName: String(formData.fatherName ?? '').trim(),
          motherName: String(formData.motherName ?? '').trim(),
          husbandName: String(formData.husbandName ?? '').trim(),
          phone: String(formData.phone ?? '').trim(),
          email: String(formData.email ?? '').trim(),
          fixedAllergies: String(formData.fixedAllergies ?? '').trim(),
          coMorbidFactor: String(formData.coMorbidFactor ?? '').trim(),
          dateOfBirth: formData.dateOfBirth,
          age: isNaN(parsedAge) ? null : parsedAge,
          ageMonths: isNaN(parsedAgeMonths) ? 0 : parsedAgeMonths,
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

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form" style={{ position: 'relative' }}>
        {onBack && (
          <IconButton
            onClick={onBack}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'var(--text)',
              zIndex: 10,
            }}
            aria-label="Close"
          >
            <CloseIcon />
          </IconButton>
        )}
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
          <label className="input-label" htmlFor="phone">Phone</label>
          <div className="input-with-icon">
            <Phone className="input-icon" />
            <input id="phone" name="phone" type="tel" pattern="[0-9\+\(\)\-\s]{7,20}" maxLength="20" title="Enter a valid phone number" value={formData.phone || ''} onChange={handleChange} disabled={loading} />
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
                value={formData.age || ''} 
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
          <label className="input-label" htmlFor="fixedAllergies">Fixed Allergies</label>
          <div className="input-with-icon">
            <LocalHospital className="input-icon" />
            <textarea
              id="fixedAllergies"
              name="fixedAllergies"
              value={formData.fixedAllergies || ''}
              onChange={handleChange}
              disabled={loading}
              rows={3}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="coMorbidFactor">Co Morbid Factor</label>
          <div className="input-with-icon">
            <MedicalServices className="input-icon" />
            <textarea
              id="coMorbidFactor"
              name="coMorbidFactor"
              value={formData.coMorbidFactor || ''}
              onChange={handleChange}
              disabled={loading}
              rows={3}
              style={{ width: '100%', resize: 'vertical' }}
            />
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
          <label className="input-label" htmlFor="husbandName">Husband/Wife Name</label>
          <div className="input-with-icon">
            <SupervisorAccount className="input-icon" />
            <input id="husbandName" name="husbandName" value={formData.husbandName || ''} onChange={handleChange} disabled={loading} />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="dateOfBirth">Date of Birth</label>
          <div className="input-with-icon">
            <CalendarToday className="input-icon" />
            <input id="dateOfBirth" name="dateOfBirth" type="date" max={todayStr} value={formData.dateOfBirth ? formData.dateOfBirth.split('T')[0] : ''} onChange={handleChange} disabled={loading} />
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
