import { useState } from 'react';
import { Button, IconButton, Snackbar, Alert, CircularProgress } from '@mui/material';
import { LocalHospital, Label, Payments, Close as CloseIcon } from '@mui/icons-material';
import { buildApiUrl } from '../../config/api';
import '../../styles/Auth.css';

/**
 * Strips emoji characters and non-standard symbols from input strings.
 *
 * @param {string} str - Raw string
 * @returns {string} Sanitized string without emojis
 */
function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .trim();
}

export default function AddCharge({ onBack, onAdd, initialCategory = 'X-Ray' }) {
  const [formData, setFormData] = useState({
    category: initialCategory,
    name: '',
    charges: '',
    subtype: 'Routine',
  });
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);

  const handleCloseToast = (event, reason) => {
    if (reason === 'clickaway') return;
    setToast(prev => ({ ...prev, open: false }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const sanitizedName = sanitizeInput(formData.name);

    if (!sanitizedName) {
      setToast({
        open: true,
        message: 'Please Enter A Valid Diagnostic Test Name.',
        severity: 'error',
      });
      return;
    }

    const parsedCharges = parseInt(formData.charges, 10);
    if (isNaN(parsedCharges) || parsedCharges < 0 || parsedCharges > 99999) {
      setToast({
        open: true,
        message: 'Charges Must Be A Non-Negative Integer Up To 99,999 PKR.',
        severity: 'error',
      });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        category: formData.category,
        name: sanitizedName,
        charges: parsedCharges,
        subtype: formData.category === 'Lab' ? formData.subtype : null,
      };

      const response = await fetch(buildApiUrl('/api/charges'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed To Create Charge (Status ${response.status})`);
      }

      const createdItem = await response.json();
      if (onAdd) {
        onAdd(createdItem);
      }
    } catch (err) {
      console.error('Error creating charge:', err);
      setToast({
        open: true,
        message: err.message || 'An Error Occurred While Saving The Charge.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form" style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
        {onBack && (
          <IconButton
            onClick={onBack}
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              color: 'hsl(215, 19%, 35%)',
              zIndex: 10,
              '&:hover': {
                color: 'hsl(0, 75%, 50%)',
                background: 'hsla(0, 75%, 50%, 0.1)',
              },
            }}
            aria-label="Close"
          >
            <CloseIcon />
          </IconButton>
        )}

        <h2 style={{ fontFamily: 'var(--heading), Georgia, serif', marginBottom: '24px', color: 'hsl(222, 47%, 11%)' }}>
          Add New Diagnostic Charge
        </h2>

        {/* Category Dropdown */}
        <div className="input-group">
          <label className="input-label" htmlFor="charge-category" style={{ fontFamily: 'var(--heading), Georgia, serif' }}>
            Category
          </label>
          <div className="input-with-icon">
            <LocalHospital className="input-icon" />
            <select
              id="charge-category"
              name="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 14px 12px 42px',
                borderRadius: '8px',
                border: '1px solid hsla(215, 25%, 80%, 0.6)',
                background: 'hsla(0, 0%, 100%, 0.85)',
                fontSize: '15px',
                color: 'hsl(222, 47%, 11%)',
              }}
            >
              <option value="X-Ray">X-Ray</option>
              <option value="Ultrasound">Ultrasound</option>
              <option value="PFT">PFT</option>
              <option value="ECG">ECG</option>
              <option value="Lab">Lab</option>
            </select>
          </div>
        </div>

        {/* Subtype Selector (Lab only) */}
        {formData.category === 'Lab' && (
          <div className="input-group">
            <label className="input-label" htmlFor="charge-subtype" style={{ fontFamily: 'var(--heading), Georgia, serif' }}>
              Test Type
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
              {['Routine', 'Special', 'No Discount'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFormData({ ...formData, subtype: st })}
                  disabled={loading}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '20px',
                    border: formData.subtype === st
                      ? '2px solid hsl(217, 91%, 60%)'
                      : '1px solid hsla(215, 25%, 80%, 0.6)',
                    background: formData.subtype === st
                      ? 'hsla(217, 91%, 60%, 0.15)'
                      : 'hsla(0, 0%, 100%, 0.85)',
                    color: formData.subtype === st
                      ? 'hsl(217, 91%, 45%)'
                      : 'hsl(222, 47%, 11%)',
                    fontWeight: formData.subtype === st ? 700 : 500,
                    fontSize: '14px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--heading), Georgia, serif',
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Test Name Input */}
        <div className="input-group">
          <label className="input-label" htmlFor="charge-name" style={{ fontFamily: 'var(--heading), Georgia, serif' }}>
            Diagnostic Test Name
          </label>
          <div className="input-with-icon">
            <Label className="input-icon" />
            <input
              id="charge-name"
              type="text"
              placeholder="e.g. LS Spine, Whole Abdomen, Pelvis"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              maxLength={100}
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 14px 12px 42px',
                borderRadius: '8px',
                border: '1px solid hsla(215, 25%, 80%, 0.6)',
                background: 'hsla(0, 0%, 100%, 0.85)',
                fontSize: '15px',
                color: 'hsl(222, 47%, 11%)',
              }}
            />
          </div>
        </div>

        {/* Charges Input */}
        <div className="input-group">
          <label className="input-label" htmlFor="charge-amount" style={{ fontFamily: 'var(--heading), Georgia, serif' }}>
            Charges In PKR
          </label>
          <div className="input-with-icon">
            <Payments className="input-icon" />
            <input
              id="charge-amount"
              type="number"
              min="0"
              max="99999"
              step="1"
              placeholder="e.g. 600, 1200"
              value={formData.charges}
              onChange={(e) => setFormData({ ...formData, charges: e.target.value })}
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 14px 12px 42px',
                borderRadius: '8px',
                border: '1px solid hsla(215, 25%, 80%, 0.6)',
                background: 'hsla(0, 0%, 100%, 0.85)',
                fontSize: '15px',
                color: 'hsl(222, 47%, 11%)',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '16px', width: '100%' }}>
          <Button
            variant="contained"
            fullWidth
            type="submit"
            disabled={loading}
            sx={{
              gap: 1,
              background: 'hsl(217, 91%, 60%)',
              color: '#ffffff',
              fontWeight: 600,
              textTransform: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              '&:hover': {
                background: 'hsl(217, 91%, 50%)',
              },
            }}
          >
            {loading ? (
              <>
                <CircularProgress size={20} color="inherit" /> Saving...
              </>
            ) : (
              'Save Charge'
            )}
          </Button>
        </div>
      </form>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={handleCloseToast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseToast} severity={toast.severity} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
