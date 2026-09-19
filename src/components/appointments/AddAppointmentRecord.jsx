import { useState, useRef, useEffect } from 'react';
import { Button, IconButton, Snackbar, Alert, CircularProgress } from '@mui/material';
import { Badge, CalendarToday, Payments, Close as CloseIcon } from '@mui/icons-material';
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
      amountPaid: '0',
    };
  });

  const amountPaidRef = useRef(null);

  useEffect(() => {
    if (amountPaidRef.current) {
      amountPaidRef.current.focus();
    }
  }, []);

  const isLinux = typeof window !== 'undefined' && /Linux|X11/i.test(navigator.userAgent);

  const [printFromServer, setPrintFromServer] = useState(() => {
    if (isLinux) return true;
    const saved = localStorage.getItem('printFromServer');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('printFromServer', printFromServer);
  }, [printFromServer]);

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
      const trimmedVal = String(value ?? '').trim();
      const val = parseInt(trimmedVal, 10);
      if (trimmedVal !== '' && (!/^\d+$/.test(trimmedVal) || isNaN(val) || val < 1 || val > 2147483647)) {
        setErrors(prev => ({ ...prev, mrNumber: 'MR Number must be a number between 1 and 2,147,483,647' }));
      } else {
        setErrors(prev => ({ ...prev, mrNumber: null }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedMrNumber = String(formData.mrNumber ?? '').trim();
    const mrNum = parseInt(trimmedMrNumber, 10);
    if (!/^\d+$/.test(trimmedMrNumber) || isNaN(mrNum) || mrNum < 1 || mrNum > 2147483647) {
      setErrors(prev => ({ ...prev, mrNumber: 'MR Number must be a number between 1 and 2,147,483,647' }));
      setToast({ open: true, message: 'Invalid MR Number format or range', severity: 'error' });
      return;
    }

    const amount = formData.amountPaid !== '' && formData.amountPaid !== null ? parseFloat(formData.amountPaid) : null;
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
          mrNumber: trimmedMrNumber,
          dateTime: formData.dateTime,
          amountPaid: formData.amountPaid,
        }),
      });

      if (response.ok) {
        const newRecord = await response.json();
        
        if (printFromServer) {
          try {
            const printRes = await fetch(`/api/appointments/${newRecord.id}/print`, { method: 'POST' });
            if (!printRes.ok) {
              console.error('Server printing failed');
            }
          } catch (pErr) {
            console.error('Error triggering server print:', pErr);
          }
          // Pass newRecord without initialPrintRecord (which triggers browser dialog)
          onAdd(newRecord, <span><u>Token is {newRecord.tokenNumber}</u> for MR number {newRecord.patient?.mrNumber || trimmedMrNumber} for {newRecord.patient?.name || 'N/A'} (Printed from Server)</span>, false);
        } else {
          // Unchecked: Trigger default browser printing dialog
          onAdd(newRecord, <span><u>Token is {newRecord.tokenNumber}</u> for MR number {newRecord.patient?.mrNumber || trimmedMrNumber} for {newRecord.patient?.name || 'N/A'}</span>, true);
        }
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
      <form onSubmit={handleSubmit} className="auth-form" autoComplete="off" style={{ position: 'relative' }}>
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
        <h2>Add New Appointment Record</h2>
        <div className="input-group">
          <label className="input-label" htmlFor="mrNumber">MR Number</label>
          <div className="input-with-icon">
            <Badge className="input-icon" />
            <input
              id="mrNumber"
              name="mrNumber"
              type="text"
              inputMode="numeric"
              pattern="[0-9]+"
              min="1"
              max="2147483647"
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

        <div 
          className="input-group" 
          style={{ 
            width: '100%', 
            display: 'flex', 
            flexDirection: 'row', 
            justifyContent: 'flex-start', 
            alignItems: 'center', 
            marginTop: '12px' 
          }}
        >
          <label 
            className="input-label" 
            htmlFor="printFromServer"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              cursor: 'pointer', 
              fontFamily: 'var(--heading), Georgia, serif', 
              fontSize: '16px', 
              fontWeight: 600, 
              color: 'var(--text, #0f172a)',
              margin: 0,
              userSelect: 'none'
            }}
          >
            <input
              id="printFromServer"
              type="checkbox"
              checked={isLinux ? true : printFromServer}
              onChange={(e) => setPrintFromServer(e.target.checked)}
              disabled={loading || isLinux}
              style={{ 
                width: '18px', 
                height: '18px', 
                accentColor: 'var(--primary, #2563eb)', 
                cursor: isLinux ? 'not-allowed' : 'pointer', 
                margin: 0 
              }}
            />
            Print from Server {isLinux ? '(Forced on Linux)' : ''}
          </label>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '10px', width: '100%' }}>
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
