import { useState, useEffect } from 'react';
import { mockData } from '../../utils/mockData';
import { Button, Snackbar, Alert, CircularProgress, Box, Typography, Paper } from '@mui/material';
import { Person, SupervisorAccount, CalendarToday, Cake, Phone, Email, LocalHospital, MedicalServices, Badge as BadgeIcon } from '@mui/icons-material';
import { buildApiUrl } from '../../config/api';
import '../../styles/Auth.css';

export default function AddPatient({ onAdd }) {
  const [formData, setFormData] = useState({
    name: '',
    fatherName: '',
    motherName: '',
    husbandName: '',
    dob: '',
    age: '',
    ageMonths: 0,
    phone: '',
    email: '',
    fixedAllergies: '',
    coMorbidFactor: '',
  });

  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);

  // Live search state
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchSource, setSearchSource] = useState(''); // 'name' or 'phone'

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
      husbandName: 'Mr. ' + randomPatient.fatherName,
      dob: randomPatient.dob,
      age: randomPatient.age.toString(),
      ageMonths: Math.floor(Math.random() * 12),
      phone: '555-' + Math.floor(1000 + Math.random() * 9000),
      email: randomPatient.name.toLowerCase().replace(' ', '.') + '@example.com',
      fixedAllergies: '',
      coMorbidFactor: '',
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

  // Debounced search logic: phone search takes priority over name search.
  // If phone is cleared or < 3 chars, it falls back to name search (if >= 2 chars).
  useEffect(() => {
    const phoneVal = String(formData.phone || '').trim();
    const nameVal = String(formData.name || '').trim();

    if (phoneVal.length < 3 && nameVal.length < 2) {
      const clearTimer = setTimeout(() => {
        setSearchResults(prev => prev.length > 0 ? [] : prev);
        setSearchSource(prev => prev !== '' ? '' : prev);
        setIsSearching(false);
      }, 0);
      return () => clearTimeout(clearTimer);
    }

    let targetSource = '';
    let targetEndpoint = '';

    if (phoneVal.length >= 3) {
      targetSource = 'phone';
      targetEndpoint = `/api/patients/search/by-phone?q=${encodeURIComponent(phoneVal)}`;
    } else {
      targetSource = 'name';
      targetEndpoint = `/api/patients/search/by-name?q=${encodeURIComponent(nameVal)}`;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchSource(targetSource);
      try {
        const res = await fetch(buildApiUrl(targetEndpoint), {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.data || []);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error(`${targetSource} search error:`, err);
        }
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [formData.phone, formData.name]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const parsedAge = parseInt(formData.age, 10);
    const parsedAgeMonths = parseInt(formData.ageMonths, 10);
    try {
      const response = await fetch(buildApiUrl('/api/patients'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: String(formData.name ?? '').trim(),
          fatherName: String(formData.fatherName ?? '').trim(),
          motherName: String(formData.motherName ?? '').trim(),
          husbandName: String(formData.husbandName ?? '').trim(),
          dateOfBirth: formData.dob,
          age: isNaN(parsedAge) ? null : parsedAge,
          ageMonths: isNaN(parsedAgeMonths) ? 0 : parsedAgeMonths,
          phone: String(formData.phone ?? '').trim(),
          email: String(formData.email ?? '').trim(),
          fixedAllergies: String(formData.fixedAllergies ?? '').trim(),
          coMorbidFactor: String(formData.coMorbidFactor ?? '').trim(),
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
    <div className="auth-container" style={{ maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', gap: '24px', width: '100%', alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' }}>
        <form onSubmit={handleSubmit} className="auth-form" style={{ flex: '1 1 400px', minWidth: 0, maxWidth: '480px' }}>
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
            <label className="input-label" htmlFor="husbandName">Husband Name</label>
            <div className="input-with-icon">
              <SupervisorAccount className="input-icon" />
              <input id="husbandName" name="husbandName" value={formData.husbandName} onChange={handleChange} disabled={loading} />
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

          <div className="input-group">
            <label className="input-label" htmlFor="fixedAllergies">Fixed Allergies</label>
            <div className="input-with-icon">
              <LocalHospital className="input-icon" />
              <textarea
                id="fixedAllergies"
                name="fixedAllergies"
                value={formData.fixedAllergies}
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
                value={formData.coMorbidFactor}
                onChange={handleChange}
                disabled={loading}
                rows={3}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '10px', width: '100%' }}>
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

        {/* Live Search results panel on the right */}
        {(searchResults.length > 0 || isSearching) && (
          <div style={{
            flex: '0 0 300px',
            maxWidth: '320px',
            width: '100%',
            maxHeight: '75vh',
            overflowY: 'auto',
            position: 'sticky',
            top: '20px',
          }}>
            <Typography variant="subtitle2" sx={{
              fontFamily: 'var(--heading), Georgia, serif',
              fontWeight: 700,
              color: 'var(--text-h)',
              mb: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              {isSearching && <CircularProgress size={16} sx={{ color: 'var(--accent)' }} />}
              {searchSource === 'phone' ? 'Phone Search Results' : 'Name Search Results'}
              {!isSearching && ` (${searchResults.length})`}
            </Typography>

            {searchResults.map(patient => (
              <Paper
                key={patient.id}
                elevation={0}
                sx={{
                  p: 1.5,
                  mb: 1.25,
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  backdropFilter: 'var(--glass-blur)',
                  boxShadow: 'var(--shadow)',
                  transition: 'all 0.2s ease',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                  <BadgeIcon sx={{ fontSize: 16, color: 'var(--accent)' }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--accent)' }}>
                    MR# {patient.mrNumber}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--text-h)', fontFamily: 'var(--heading), Georgia, serif' }}>
                  {patient.name || 'N/A'}
                </Typography>
                {patient.phone && (
                  <Typography variant="caption" sx={{ color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <Phone sx={{ fontSize: 13 }} /> {patient.phone}
                  </Typography>
                )}
                {(patient.age !== null && patient.age !== undefined) && (
                  <Typography variant="caption" sx={{ color: 'var(--text)', display: 'block', mt: 0.25 }}>
                    Age: {patient.age} year{patient.age !== 1 ? 's' : ''}
                    {patient.ageMonths ? ` ${patient.ageMonths} month${patient.ageMonths !== 1 ? 's' : ''}` : ''}
                  </Typography>
                )}
              </Paper>
            ))}

            {!isSearching && searchResults.length === 0 && searchSource && (
              <Typography variant="caption" sx={{ color: 'var(--text)', fontStyle: 'italic', display: 'block', p: 1 }}>
                No matching patients found.
              </Typography>
            )}
          </div>
        )}
      </div>

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
