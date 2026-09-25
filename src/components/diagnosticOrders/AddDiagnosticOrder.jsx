import { useState, useEffect } from 'react';
import { Button, IconButton, Snackbar, Alert, CircularProgress, Checkbox, FormControlLabel } from '@mui/material';
import {
  Badge,
  LocalHospital,
  Label,
  MedicalServices,
  Visibility,
  Close as CloseIcon,
  Print,
} from '@mui/icons-material';
import usePatientLookup from '../../hooks/usePatientLookup';
import PatientNameField from '../common/PatientNameField';
import { XRAY_TYPES, XRAY_SIDES, XRAY_VIEWS, ULTRASOUND_TYPES } from '../../constants/documentTypes';
import { buildApiUrl } from '../../config/api';
import '../../styles/Auth.css';

export default function AddDiagnosticOrder({ onBack, onAdd, initialMrNumber = '' }) {
  const [formData, setFormData] = useState({
    mrNumber: initialMrNumber,
    category: 'X-Ray',
    type: '',
    charges: '',
    side: 'N/A',
    view: 'N/A',
  });

  const [availableTypes, setAvailableTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  const { patientName, lookupStatus: patientLookupStatus } = usePatientLookup(formData.mrNumber);

  const isLinux = typeof window !== 'undefined' && /Linux|X11/i.test(navigator.userAgent);
  const [printFromServer, setPrintFromServer] = useState(() => {
    if (isLinux) return true;
    const saved = localStorage.getItem('printFromServer');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('printFromServer', printFromServer);
  }, [printFromServer]);

  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleCloseToast = (event, reason) => {
    if (reason === 'clickaway') return;
    setToast((prev) => ({ ...prev, open: false }));
  };

  // Load types dynamically when category changes
  useEffect(() => {
    let isCancelled = false;

    async function fetchCategoryTypes() {
      setLoadingTypes(true);
      try {
        let loaded = false;
        try {
          const response = await fetch(buildApiUrl(`/api/charges/types/${encodeURIComponent(formData.category)}`));
          if (response.ok) {
            const list = await response.json();
            if (!isCancelled && Array.isArray(list) && list.length > 0) {
              setAvailableTypes(list);
              const firstType = list[0];
              setFormData((prev) => ({
                ...prev,
                type: firstType.value || firstType.name,
                charges: String(firstType.charges !== undefined ? firstType.charges : 600),
              }));
              loaded = true;
            }
          }
        } catch (apiErr) {
          console.warn('Could not fetch types from API, using fallback constants:', apiErr);
        }

        // Fallback constants if API did not load
        if (!loaded && !isCancelled) {
          let fallbackList = [];
          if (formData.category === 'X-Ray') {
            fallbackList = XRAY_TYPES.map((t) => ({ value: t.value, label: t.label, charges: t.defaultCharges }));
          } else if (formData.category === 'Ultrasound') {
            fallbackList = ULTRASOUND_TYPES.map((t) => ({ value: t.value, label: t.label, charges: t.defaultCharges }));
          } else if (formData.category === 'PFT') {
            fallbackList = [{ value: 'PFT Standard', label: 'PFT Standard', charges: 1000 }];
          } else if (formData.category === 'ECG') {
            fallbackList = [{ value: 'ECG Standard', label: 'ECG Standard', charges: 500 }];
          }

          setAvailableTypes(fallbackList);
          if (fallbackList.length > 0) {
            setFormData((prev) => ({
              ...prev,
              type: fallbackList[0].value,
              charges: String(fallbackList[0].charges),
            }));
          }
        }
      } finally {
        if (!isCancelled) {
          setLoadingTypes(false);
        }
      }
    }

    fetchCategoryTypes();

    return () => {
      isCancelled = true;
    };
  }, [formData.category]);

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    setFormData((prev) => ({
      ...prev,
      category: newCategory,
      side: newCategory === 'X-Ray' ? 'N/A' : 'N/A',
      view: newCategory === 'X-Ray' ? 'N/A' : 'N/A',
    }));
  };

  const handleTypeChange = (e) => {
    const selectedVal = e.target.value;
    const match = availableTypes.find((t) => (t.value || t.name) === selectedVal);
    setFormData((prev) => ({
      ...prev,
      type: selectedVal,
      charges: match && match.charges !== undefined ? String(match.charges) : prev.charges,
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'charges') {
      const val = parseInt(value, 10);
      if (value !== '' && (isNaN(val) || val < 0)) {
        setErrors((prev) => ({ ...prev, charges: 'Charges Cannot Be Negative' }));
      } else if (value !== '' && val > 999999) {
        setErrors((prev) => ({ ...prev, charges: 'Charges Cannot Exceed 999,999 PKR' }));
      } else {
        setErrors((prev) => ({ ...prev, charges: null }));
      }
    }

    if (name === 'mrNumber') {
      const trimmedVal = String(value ?? '').trim();
      const val = parseInt(trimmedVal, 10);
      if (trimmedVal !== '' && (!/^\d+$/.test(trimmedVal) || isNaN(val) || val < 1 || val > 2147483647)) {
        setErrors((prev) => ({ ...prev, mrNumber: 'MR Number Must Be Between 1 And 2,147,483,647' }));
      } else {
        setErrors((prev) => ({ ...prev, mrNumber: null }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedMr = String(formData.mrNumber ?? '').trim();
    const mrNum = parseInt(trimmedMr, 10);
    if (!/^\d+$/.test(trimmedMr) || isNaN(mrNum) || mrNum < 1 || mrNum > 2147483647) {
      setToast({ open: true, message: 'Invalid MR Number. Must Be An Integer Up To 2,147,483,647.', severity: 'error' });
      return;
    }

    if (!formData.category || !formData.type) {
      setToast({ open: true, message: 'Please Select A Category And Diagnostic Test Type.', severity: 'error' });
      return;
    }

    const parsedCharges = parseInt(formData.charges, 10);
    if (isNaN(parsedCharges) || parsedCharges < 0 || parsedCharges > 999999) {
      setToast({ open: true, message: 'Charges Must Be A Non-Negative Integer Up To 999,999 PKR.', severity: 'error' });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        mrNumber: mrNum,
        category: formData.category,
        type: formData.type,
        charges: parsedCharges,
        side: formData.category === 'X-Ray' ? formData.side : 'N/A',
        view: formData.category === 'X-Ray' ? formData.view : 'N/A',
      };

      const response = await fetch(buildApiUrl('/api/diagnostic-orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed To Create Order (Status ${response.status})`);
      }

      const createdOrder = await response.json();

      // Trigger thermal print if enabled
      if (printFromServer) {
        try {
          const printRes = await fetch(buildApiUrl(`/api/diagnostic-orders/${createdOrder.id}/print`), {
            method: 'POST',
          });
          if (!printRes.ok) {
            console.warn('Server hardware print failed or printer unavailable');
          }
        } catch (pErr) {
          console.error('Error triggering server hardware print:', pErr);
        }
      }

      if (onAdd) {
        onAdd(createdOrder, 'Diagnostic Order Saved Successfully!');
      }
    } catch (err) {
      console.error('Error saving diagnostic order:', err);
      setToast({
        open: true,
        message: err.message || 'An Error Occurred While Saving The Diagnostic Order.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form" style={{ position: 'relative', width: '100%', maxWidth: '540px' }}>
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

        <h2 style={{ fontFamily: 'var(--heading), Georgia, serif', marginBottom: '20px', color: 'hsl(222, 47%, 11%)' }}>
          Add New Diagnostic Order
        </h2>

        {/* MR Number Field */}
        <div className="input-group">
          <label className="input-label" htmlFor="order-mrNumber" style={{ fontFamily: 'var(--heading), Georgia, serif' }}>
            MR Number
          </label>
          <div className="input-with-icon">
            <Badge className="input-icon" />
            <input
              id="order-mrNumber"
              name="mrNumber"
              type="text"
              autoFocus
              inputMode="numeric"
              pattern="[0-9]+"
              min="1"
              max="2147483647"
              value={formData.mrNumber}
              onChange={handleChange}
              required
              disabled={loading}
              autoComplete="off"
              style={{
                width: '100%',
                padding: '12px 14px 12px 42px',
                borderRadius: '8px',
                border: errors.mrNumber ? '1px solid hsl(0, 75%, 50%)' : '1px solid hsla(215, 25%, 80%, 0.6)',
                background: 'hsla(0, 0%, 100%, 0.85)',
                fontSize: '15px',
                color: 'hsl(222, 47%, 11%)',
              }}
            />
          </div>
          {errors.mrNumber && (
            <span style={{ color: 'hsl(0, 75%, 50%)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              {errors.mrNumber}
            </span>
          )}
        </div>

        {/* Patient Name (Read-Only via Lookup) */}
        <PatientNameField patientName={patientName} lookupStatus={patientLookupStatus} />

        {/* Category Dropdown */}
        <div className="input-group">
          <label className="input-label" htmlFor="order-category" style={{ fontFamily: 'var(--heading), Georgia, serif' }}>
            Category
          </label>
          <div className="input-with-icon">
            <LocalHospital className="input-icon" />
            <select
              id="order-category"
              name="category"
              value={formData.category}
              onChange={handleCategoryChange}
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
            </select>
          </div>
        </div>

        {/* Type Dropdown */}
        <div className="input-group">
          <label className="input-label" htmlFor="order-type" style={{ fontFamily: 'var(--heading), Georgia, serif' }}>
            Diagnostic Test Name
            {loadingTypes && (
              <span style={{ fontSize: '11px', color: 'hsl(217, 91%, 60%)', marginLeft: '8px' }}>
                (Loading Types...)
              </span>
            )}
          </label>
          <div className="input-with-icon">
            <Label className="input-icon" />
            <select
              id="order-type"
              name="type"
              value={formData.type}
              onChange={handleTypeChange}
              required
              disabled={loading || loadingTypes}
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
              {availableTypes.map((t) => (
                <option key={t.value || t.name} value={t.value || t.name}>
                  {t.label || t.name}
                  {t.charges !== undefined ? ` (Rs. ${t.charges})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Side & View Dropdowns (X-Ray only) */}
        {formData.category === 'X-Ray' && (
          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label" htmlFor="order-side" style={{ fontFamily: 'var(--heading), Georgia, serif' }}>
                Side
              </label>
              <div className="input-with-icon">
                <MedicalServices className="input-icon" />
                <select
                  id="order-side"
                  name="side"
                  value={formData.side}
                  onChange={handleChange}
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
                  {XRAY_SIDES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label" htmlFor="order-view" style={{ fontFamily: 'var(--heading), Georgia, serif' }}>
                View
              </label>
              <div className="input-with-icon">
                <Visibility className="input-icon" />
                <select
                  id="order-view"
                  name="view"
                  value={formData.view}
                  onChange={handleChange}
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
                  {XRAY_VIEWS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}



        {/* Print from Server Checkbox */}
        <div style={{ marginTop: '8px', marginBottom: '16px' }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={printFromServer}
                onChange={(e) => setPrintFromServer(e.target.checked)}
                sx={{
                  color: 'hsl(217, 91%, 60%)',
                  '&.Mui-checked': {
                    color: 'hsl(217, 91%, 60%)',
                  },
                }}
              />
            }
            label={
              <span
                style={{
                  fontFamily: 'var(--heading), Georgia, serif',
                  fontSize: '14px',
                  color: 'hsl(215, 19%, 35%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Print style={{ fontSize: '18px', color: 'hsl(217, 91%, 60%)' }} />
                Print Receipt Directly From Server Thermal Printer
              </span>
            }
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '10px', width: '100%' }}>
          <Button
            variant="contained"
            fullWidth
            type="submit"
            disabled={loading}
            sx={{
              gap: 1,
              background: 'hsl(217, 91%, 60%)',
              color: '#ffffff',
              fontFamily: 'var(--heading), Georgia, serif',
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
              'Save Diagnostic Order'
            )}
          </Button>

          {onBack && (
            <Button
              variant="outlined"
              onClick={onBack}
              disabled={loading}
              sx={{
                fontFamily: 'var(--heading), Georgia, serif',
                textTransform: 'none',
                color: 'hsl(215, 19%, 35%)',
                borderColor: 'hsla(215, 25%, 80%, 0.8)',
                borderRadius: '8px',
                '&:hover': {
                  borderColor: 'hsl(215, 19%, 35%)',
                },
              }}
            >
              Cancel
            </Button>
          )}
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
