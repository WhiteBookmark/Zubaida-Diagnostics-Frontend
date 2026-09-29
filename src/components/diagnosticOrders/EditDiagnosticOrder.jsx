import { useState, useEffect } from 'react';
import { Button, IconButton, Snackbar, Alert, CircularProgress } from '@mui/material';
import {
  Badge,
  Label,
  Payments,
  Close as CloseIcon,
  Print,
  LocalOffer,
} from '@mui/icons-material';
import usePatientLookup from '../../hooks/usePatientLookup';
import PatientNameField from '../common/PatientNameField';
import { XRAY_TYPES, XRAY_SIDES, XRAY_VIEWS, ULTRASOUND_TYPES } from '../../constants/documentTypes';
import { buildApiUrl } from '../../config/api';
import '../../styles/Auth.css';

export default function EditDiagnosticOrder({ record, onBack, onSave }) {
  const [formData, setFormData] = useState(() => ({
    mrNumber: record?.patient?.mrNumber || '',
    category: record?.category || 'X-Ray',
    type: record?.type || '',
    charges: record?.charges !== undefined ? String(record.charges) : '',
    discount: record?.discount !== undefined ? String(record.discount) : '0',
    side: record?.side || 'N/A',
    view: record?.view || 'N/A',
  }));

  const [availableTypes, setAvailableTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [isReprinting, setIsReprinting] = useState(false);

  const { patientName, lookupStatus: patientLookupStatus } = usePatientLookup(
    formData.mrNumber,
    record?.patient ? { mrNumber: record.patient.mrNumber, name: record.patient.name } : null
  );

  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

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
              loaded = true;
            }
          }
        } catch (err) {
          console.warn('Could not fetch types from API, using fallback constants:', err);
        }

        // Fallback constants
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

  const handleCloseToast = (event, reason) => {
    if (reason === 'clickaway') return;
    setToast((prev) => ({ ...prev, open: false }));
  };

  const handleCategoryChange = (newCategory) => {
    setFormData((prev) => ({
      ...prev,
      category: newCategory,
      side: 'N/A',
      view: 'N/A',
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
      const currentDiscount = parseInt(formData.discount || '0', 10);
      let chargesErr = null;
      if (value !== '' && (isNaN(val) || val < 0)) {
        chargesErr = 'Charges Cannot Be Negative';
      } else if (value !== '' && val > 999999) {
        chargesErr = 'Charges Cannot Exceed 999,999 PKR';
      }

      let discountErr = errors.discount;
      if (!isNaN(val) && !isNaN(currentDiscount) && currentDiscount > val) {
        discountErr = 'Discount Cannot Be More Than Charges';
      } else if (discountErr === 'Discount Cannot Be More Than Charges') {
        discountErr = null;
      }

      setErrors((prev) => ({ ...prev, charges: chargesErr, discount: discountErr }));
    }

    if (name === 'discount') {
      const val = parseInt(value, 10);
      const chargesVal = parseInt(formData.charges, 10);
      if (value !== '' && (isNaN(val) || val < 0)) {
        setErrors((prev) => ({ ...prev, discount: 'Discount Cannot Be Negative' }));
      } else if (value !== '' && val > 999999) {
        setErrors((prev) => ({ ...prev, discount: 'Discount Cannot Exceed 999,999 PKR' }));
      } else if (value !== '' && !isNaN(val) && !isNaN(chargesVal) && val > chargesVal) {
        setErrors((prev) => ({ ...prev, discount: 'Discount Cannot Be More Than Charges' }));
      } else {
        setErrors((prev) => ({ ...prev, discount: null }));
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

  const handleReprintReceipt = async () => {
    if (!record?.id) return;
    setIsReprinting(true);
    try {
      const response = await fetch(buildApiUrl(`/api/diagnostic-orders/${record.id}/print`), {
        method: 'POST',
      });
      if (response.ok) {
        setToast({ open: true, message: 'Receipt Sent To Server Printer Successfully!', severity: 'success' });
      } else {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Server Printer Unavailable');
      }
    } catch (err) {
      setToast({ open: true, message: err.message || 'Failed To Reprint Receipt', severity: 'error' });
    } finally {
      setIsReprinting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!record?.id) {
      setToast({ open: true, message: 'No Record Selected For Editing.', severity: 'error' });
      return;
    }

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

    const trimmedDiscount = String(formData.discount ?? '0').trim();
    const parsedDiscount = parseInt(trimmedDiscount || '0', 10);
    if (trimmedDiscount !== '' && (!/^\d+$/.test(trimmedDiscount) || isNaN(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 999999)) {
      setToast({ open: true, message: 'Invalid Discount. Must Be An Integer Between 0 And 999,999.', severity: 'error' });
      return;
    }

    if (parsedDiscount > parsedCharges) {
      setToast({ open: true, message: 'Discount Cannot Be More Than Charges.', severity: 'error' });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        mrNumber: mrNum,
        category: formData.category,
        type: formData.type,
        charges: parsedCharges,
        discount: parsedDiscount,
        side: formData.category === 'X-Ray' ? formData.side : 'N/A',
        view: formData.category === 'X-Ray' ? formData.view : 'N/A',
      };

      const response = await fetch(buildApiUrl(`/api/diagnostic-orders/${record.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed To Update Order (Status ${response.status})`);
      }

      const updatedOrder = await response.json();

      if (onSave) {
        onSave(updatedOrder, 'Diagnostic Order Updated Successfully!');
      }
    } catch (err) {
      console.error('Error updating diagnostic order:', err);
      setToast({
        open: true,
        message: err.message || 'An Error Occurred While Updating The Diagnostic Order.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form" style={{ position: 'relative', width: '100%', maxWidth: '720px' }}>
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
          Edit Diagnostic Order
        </h2>

        {/* MR Number Field */}
        <div className="input-group">
          <label className="input-label" htmlFor="edit-order-mrNumber" style={{ fontFamily: 'var(--heading), Georgia, serif' }}>
            MR Number
          </label>
          <div className="input-with-icon">
            <Badge className="input-icon" />
            <input
              id="edit-order-mrNumber"
              name="mrNumber"
              type="text"
              inputMode="numeric"
              pattern="[0-9]+"
              min="1"
              max="2147483647"
              value={formData.mrNumber}
              onChange={handleChange}
              placeholder="e.g. 97, 2097"
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

        {/* Patient Name (Read-Only via Lookup, No Label) */}
        <PatientNameField patientName={patientName} lookupStatus={patientLookupStatus} showLabel={false} />

        {/* 1st Row: Category Chips horizontally in 1 line */}
        <div className="input-group" style={{ width: '100%', marginTop: '8px' }}>
          <label className="input-label" htmlFor="edit-order-category" style={{ fontFamily: 'var(--heading), Georgia, serif' }}>
            Category
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
            {['X-Ray', 'Ultrasound', 'PFT', 'ECG'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryChange(cat)}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: formData.category === cat
                    ? '2px solid hsl(217, 91%, 60%)'
                    : '1px solid hsla(215, 25%, 80%, 0.6)',
                  background: formData.category === cat
                    ? 'hsla(217, 91%, 60%, 0.15)'
                    : 'hsla(0, 0%, 100%, 0.85)',
                  color: formData.category === cat
                    ? 'hsl(217, 91%, 45%)'
                    : 'hsl(222, 47%, 11%)',
                  fontWeight: formData.category === cat ? 700 : 500,
                  fontSize: '14px',
                  whiteSpace: 'nowrap',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--heading), Georgia, serif',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 2nd Row: Diagnostic Test Name, Charges, Discount in 1 horizontal line (3 columns) */}
        <div style={{ display: 'flex', gap: '12px', width: '100%', alignItems: 'flex-start', flexWrap: 'wrap', marginTop: '8px' }}>
          {/* Diagnostic Test Name */}
          <div className="input-group" style={{ flex: '1.6 1 200px', minWidth: '180px', margin: 0 }}>
            <label className="input-label" htmlFor="edit-order-type" style={{ fontFamily: 'var(--heading), Georgia, serif' }}>
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
                id="edit-order-type"
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

          {/* Charges */}
          <div className="input-group" style={{ flex: '1 1 120px', minWidth: '110px', margin: 0 }}>
            <label className="input-label" htmlFor="edit-order-charges" style={{ fontFamily: 'var(--heading), Georgia, serif' }}>
              Charges
            </label>
            <div className="input-with-icon">
              <Payments className="input-icon" />
              <input
                id="edit-order-charges"
                name="charges"
                type="number"
                min="0"
                max="999999"
                step="1"
                placeholder="e.g. 600, 1200"
                value={formData.charges}
                onChange={handleChange}
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: '8px',
                  border: errors.charges ? '1px solid hsl(0, 75%, 50%)' : '1px solid hsla(215, 25%, 80%, 0.6)',
                  background: 'hsla(0, 0%, 100%, 0.85)',
                  fontSize: '15px',
                  color: 'hsl(222, 47%, 11%)',
                }}
              />
            </div>
            {errors.charges && (
              <span style={{ color: 'hsl(0, 75%, 50%)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {errors.charges}
              </span>
            )}
          </div>

          {/* Discount */}
          <div className="input-group" style={{ flex: '1 1 120px', minWidth: '110px', margin: 0 }}>
            <label className="input-label" htmlFor="edit-order-discount" style={{ fontFamily: 'var(--heading), Georgia, serif' }}>
              Discount
            </label>
            <div className="input-with-icon">
              <LocalOffer className="input-icon" />
              <input
                id="edit-order-discount"
                name="discount"
                type="number"
                min="0"
                max={formData.charges ? Math.min(parseInt(formData.charges, 10) || 999999, 999999) : 999999}
                step="1"
                placeholder="e.g. 0, 100"
                value={formData.discount ?? '0'}
                onChange={handleChange}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: '8px',
                  border: errors.discount ? '1px solid hsl(0, 75%, 50%)' : '1px solid hsla(215, 25%, 80%, 0.6)',
                  background: 'hsla(0, 0%, 100%, 0.85)',
                  fontSize: '15px',
                  color: 'hsl(222, 47%, 11%)',
                }}
              />
            </div>
            {errors.discount && (
              <span style={{ color: 'hsl(0, 75%, 50%)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {errors.discount}
              </span>
            )}
          </div>
        </div>

        {/* 3rd Row: Side & View Chips (X-Ray only) */}
        {formData.category === 'X-Ray' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', width: '100%', marginTop: '8px' }}>
            <div className="input-group" style={{ flex: '1 1 240px', margin: 0 }}>
              <label className="input-label" htmlFor="edit-order-side" style={{ fontFamily: 'var(--heading), Georgia, serif' }}>
                Side
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
                {XRAY_SIDES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, side: s }))}
                    disabled={loading}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: formData.side === s
                        ? '2px solid hsl(217, 91%, 60%)'
                        : '1px solid hsla(215, 25%, 80%, 0.6)',
                      background: formData.side === s
                        ? 'hsla(217, 91%, 60%, 0.15)'
                        : 'hsla(0, 0%, 100%, 0.85)',
                      color: formData.side === s
                        ? 'hsl(217, 91%, 45%)'
                        : 'hsl(222, 47%, 11%)',
                      fontWeight: formData.side === s ? 700 : 500,
                      fontSize: '14px',
                      whiteSpace: 'nowrap',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--heading), Georgia, serif',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="input-group" style={{ flex: '1.2 1 280px', margin: 0 }}>
              <label className="input-label" htmlFor="edit-order-view" style={{ fontFamily: 'var(--heading), Georgia, serif' }}>
                View
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
                {XRAY_VIEWS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, view: v }))}
                    disabled={loading}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: formData.view === v
                        ? '2px solid hsl(217, 91%, 60%)'
                        : '1px solid hsla(215, 25%, 80%, 0.6)',
                      background: formData.view === v
                        ? 'hsla(217, 91%, 60%, 0.15)'
                        : 'hsla(0, 0%, 100%, 0.85)',
                      color: formData.view === v
                        ? 'hsl(217, 91%, 45%)'
                        : 'hsl(222, 47%, 11%)',
                      fontWeight: formData.view === v ? 700 : 500,
                      fontSize: '14px',
                      whiteSpace: 'nowrap',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--heading), Georgia, serif',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Reprint Receipt Button */}
        <div style={{ marginTop: '8px', marginBottom: '16px' }}>
          <Button
            type="button"
            variant="outlined"
            onClick={handleReprintReceipt}
            disabled={isReprinting || loading}
            startIcon={isReprinting ? <CircularProgress size={16} /> : <Print />}
            sx={{
              textTransform: 'none',
              color: 'hsl(217, 91%, 60%)',
              borderColor: 'hsl(217, 91%, 60%)',
              borderRadius: '8px',
              padding: '6px 14px',
              '&:hover': {
                borderColor: 'hsl(217, 91%, 50%)',
                background: 'hsla(217, 91%, 60%, 0.08)',
              },
            }}
          >
            {isReprinting ? 'Sending To Printer...' : 'Reprint Thermal Receipt'}
          </Button>
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
                <CircularProgress size={20} color="inherit" /> Updating...
              </>
            ) : (
              'Update Diagnostic Order'
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
