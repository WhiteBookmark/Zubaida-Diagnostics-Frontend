import { useState, useRef, useEffect } from 'react';
import { Button, Snackbar, Alert, CircularProgress } from '@mui/material';
import { Badge, CalendarToday, Payments } from '@mui/icons-material';
import '../../styles/Auth.css';

export default function AddAppointmentRecord({ onBack, onAdd, initialMrNumber = '', initialToastMessage = '' }) {
  const [formData, setFormData] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return {
      mrNumber: initialMrNumber,
      dateTime: `${year}-${month}-${day}T${hours}:${minutes}`,
      amountPaid: '',
    };
  });

  const amountPaidRef = useRef(null);

  useEffect(() => {
    if (amountPaidRef.current) {
      amountPaidRef.current.focus();
    }
  }, []);

  const [toast, setToast] = useState({ open: !!initialToastMessage, message: initialToastMessage || '', severity: 'success' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleCloseToast = (event, reason) => {
    if (reason === 'clickaway') return;
    setToast(prev => ({ ...prev, open: false }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (name === 'amountPaid') {
      const val = parseFloat(value);
      if (value !== '' && (isNaN(val) || val < 0)) {
        setErrors(prev => ({ ...prev, amountPaid: 'Amount paid cannot be negative' }));
      } else if (value !== '' && val > 1000000) {
        setErrors(prev => ({ ...prev, amountPaid: 'Amount paid cannot exceed 1,000,000' }));
      } else {
        setErrors(prev => ({ ...prev, amountPaid: null }));
      }
    }
    if (name === 'mrNumber') {
      const val = parseInt(value, 10);
      if (value !== '' && (!/^\d+$/.test(value) || isNaN(val) || val < 1 || val > 2147483647)) {
        setErrors(prev => ({ ...prev, mrNumber: 'MR Number must be a number between 1 and 2,147,483,647' }));
      } else {
        setErrors(prev => ({ ...prev, mrNumber: null }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const mrNum = parseInt(formData.mrNumber, 10);
    if (!/^\d+$/.test(formData.mrNumber) || isNaN(mrNum) || mrNum < 1 || mrNum > 2147483647) {
      setErrors(prev => ({ ...prev, mrNumber: 'MR Number must be a number between 1 and 2,147,483,647' }));
      setToast({ open: true, message: 'Invalid MR Number format or range', severity: 'error' });
      return;
    }

    const amount = formData.amountPaid ? parseFloat(formData.amountPaid) : null;
    if (amount !== null) {
      if (isNaN(amount) || amount < 0) {
        setErrors(prev => ({ ...prev, amountPaid: 'Amount paid cannot be negative' }));
        setToast({ open: true, message: 'Amount paid cannot be negative', severity: 'error' });
        return;
      }
      if (amount > 1000000) {
        setErrors(prev => ({ ...prev, amountPaid: 'Amount paid cannot exceed 1,000,000' }));
        setToast({ open: true, message: 'Amount paid cannot exceed 1,000,000', severity: 'error' });
        return;
      }
    }

    setLoading(true);
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mrNumber: formData.mrNumber,
          dateTime: formData.dateTime,
          amountPaid: formData.amountPaid,
        }),
      });

      if (response.ok) {
        const newRecord = await response.json();
        onAdd(newRecord, <span><u>Token is {newRecord.tokenNumber}</u> for MR number {newRecord.patient?.mrNumber || formData.mrNumber} for {newRecord.patient?.name || 'N/A'}</span>);
      } else {
        const errorData = await response.json();
        setToast({ open: true, message: `Failed to add appointment: ${errorData.error || 'Unknown error'}`, severity: 'error' });
      }
    } catch (error) {
      console.error('Error adding appointment:', error);
      setToast({ open: true, message: 'Error adding appointment: ' + error.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form" autoComplete="off">
        <h2>Add New Appointment Record</h2>
        <div className="input-group">
          <label className="input-label" htmlFor="mrNumber">MR Number</label>
          <div className="input-with-icon">
            <Badge className="input-icon" />
            <input
              id="mrNumber"
              name="mrNumber"
              type="text"
              value={formData.mrNumber}
              onChange={handleChange}
              required
              disabled={loading}
              autoComplete="off"
              style={errors.mrNumber ? { borderColor: 'hsl(0, 84%, 60%)' } : {}}
            />
          </div>
          {errors.mrNumber && (
            <span style={{ color: 'hsl(0, 84%, 60%)', fontSize: '12px', marginTop: '4px', display: 'block', fontFamily: 'var(--sans)' }}>
              {errors.mrNumber}
            </span>
          )}
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="dateTime">Date & Time</label>
          <div className="input-with-icon">
            <CalendarToday className="input-icon" />
            <input 
              id="dateTime" 
              name="dateTime" 
              type="datetime-local" 
              value={formData.dateTime} 
              onChange={handleChange} 
              required 
              disabled={loading} 
              autoComplete="off" 
            />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="amountPaid">Amount Paid</label>
          <div className="input-with-icon">
            <Payments className="input-icon" />
            <input
              id="amountPaid"
              name="amountPaid"
              type="number"
              step="0.01"
              min="0"
              max="1000000"
              value={formData.amountPaid}
              onChange={handleChange}
              disabled={loading}
              autoComplete="off"
              ref={amountPaidRef}
              style={errors.amountPaid ? { borderColor: 'hsl(0, 84%, 60%)' } : {}}
            />
          </div>
          {errors.amountPaid && (
            <span style={{ color: 'hsl(0, 84%, 60%)', fontSize: '12px', marginTop: '4px', display: 'block', fontFamily: 'var(--sans)' }}>
              {errors.amountPaid}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '10px', width: '100%' }}>
          <Button variant="contained" fullWidth onClick={onBack} disabled={loading}>Cancel</Button>
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
