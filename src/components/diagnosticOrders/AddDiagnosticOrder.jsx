import { useState, useEffect, useRef, useCallback } from 'react';
import { Button, IconButton, Snackbar, Alert, CircularProgress, Checkbox, FormControlLabel } from '@mui/material';
import {
  Badge,
  LocalHospital,
  Label,
  MedicalServices,
  Visibility,
  Close as CloseIcon,
  Print,
  Add as AddIcon,
  DeleteOutline as DeleteIcon,
  AttachMoney,
} from '@mui/icons-material';
import usePatientLookup from '../../hooks/usePatientLookup';
import PatientNameField from '../common/PatientNameField';
import { XRAY_TYPES, XRAY_SIDES, XRAY_VIEWS, ULTRASOUND_TYPES } from '../../constants/documentTypes';
import { buildApiUrl } from '../../config/api';
import '../../styles/Auth.css';

/**
 * Creates a unique order item for the Dynamic Form Repeater.
 */
const createNewOrder = () => ({
  id: typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `order-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  category: 'X-Ray',
  type: '',
  charges: '',
  side: 'N/A',
  view: 'N/A',
});

export default function AddDiagnosticOrder({ onBack, onAdd, initialMrNumber = '' }) {
  // Card 1: Patient MR Number (constant across all orders)
  const [mrNumber, setMrNumber] = useState(initialMrNumber);

  // Dynamic Form Repeater (Form Array) for diagnostic order items
  const [orders, setOrders] = useState([createNewOrder()]);

  // Map of orderId -> { types: Array, loading: boolean }
  const [orderTypesMap, setOrderTypesMap] = useState({});

  // Validation errors
  const [errors, setErrors] = useState({});
  const [orderErrors, setOrderErrors] = useState({});

  // Patient lookup hook
  const { patientName, lookupStatus: patientLookupStatus } = usePatientLookup(mrNumber);

  // Printer configuration from local storage
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

  // Ref for instant scrolling to the newest card added
  const lastCardRef = useRef(null);

  const handleCloseToast = (event, reason) => {
    if (reason === 'clickaway') return;
    setToast((prev) => ({ ...prev, open: false }));
  };

  /**
   * Helper function to fetch test types for a given category.
   * Tries backend API first, falls back to local constants.
   */
  const fetchCategoryTypes = useCallback(async (category) => {
    let loadedList = null;
    try {
      const response = await fetch(buildApiUrl(`/api/charges/types/${encodeURIComponent(category)}`));
      if (response.ok) {
        const list = await response.json();
        if (Array.isArray(list) && list.length > 0) {
          loadedList = list.map((item) => ({
            value: item.value || item.name,
            label: item.label || item.name,
            charges: item.charges !== undefined ? item.charges : 600,
          }));
        }
      }
    } catch (apiErr) {
      console.warn('Could not fetch types from API, using fallback constants:', apiErr);
    }

    if (!loadedList || loadedList.length === 0) {
      if (category === 'X-Ray') {
        loadedList = XRAY_TYPES.map((t) => ({ value: t.value, label: t.label, charges: t.defaultCharges }));
      } else if (category === 'Ultrasound') {
        loadedList = ULTRASOUND_TYPES.map((t) => ({ value: t.value, label: t.label, charges: t.defaultCharges }));
      } else if (category === 'PFT') {
        loadedList = [{ value: 'PFT Standard', label: 'PFT Standard', charges: 1000 }];
      } else if (category === 'ECG') {
        loadedList = [{ value: 'ECG Standard', label: 'ECG Standard', charges: 500 }];
      } else {
        loadedList = [];
      }
    }

    return loadedList;
  }, []);

  /**
   * Loads category types for a specific order card and initializes its type and charges.
   */
  const loadTypesForOrder = useCallback(
    async (orderId, category) => {
      setOrderTypesMap((prev) => ({
        ...prev,
        [orderId]: { types: prev[orderId]?.types || [], loading: true },
      }));

      const types = await fetchCategoryTypes(category);

      setOrderTypesMap((prev) => ({
        ...prev,
        [orderId]: { types, loading: false },
      }));

      if (types.length > 0) {
        const firstType = types[0];
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                ...o,
                category,
                type: firstType.value,
                charges: String(firstType.charges !== undefined ? firstType.charges : 600),
              }
              : o
          )
        );
      }
    },
    [fetchCategoryTypes]
  );

  // Ref to track initial order for mount initialization
  const initialOrderIdRef = useRef(orders[0]?.id);
  const initialCategoryRef = useRef(orders[0]?.category);

  // Initialize types for the first order card on mount
  useEffect(() => {
    let isCancelled = false;

    async function initFirstOrder() {
      const initialId = initialOrderIdRef.current;
      const initialCategory = initialCategoryRef.current;
      if (!initialId) return;

      const types = await fetchCategoryTypes(initialCategory);
      if (isCancelled) return;


      setOrderTypesMap((prev) => ({
        ...prev,
        [initialId]: { types, loading: false },
      }));

      if (types.length > 0) {
        const firstType = types[0];
        setOrders((prev) =>
          prev.map((o) =>
            o.id === initialId
              ? {
                ...o,
                category: initialCategory,
                type: firstType.value,
                charges: String(firstType.charges !== undefined ? firstType.charges : 600),
              }
              : o
          )
        );
      }
    }

    initFirstOrder();

    return () => {
      isCancelled = true;
    };
  }, [fetchCategoryTypes]);


  /**
   * Add a new card to the form repeater and scroll to it instantly without animation.
   */
  const addOrderCard = () => {
    const newOrder = createNewOrder();
    setOrders((prev) => [...prev, newOrder]);
    loadTypesForOrder(newOrder.id, newOrder.category);

    // Instant scroll to the newly added card without animation
    setTimeout(() => {
      if (lastCardRef.current) {
        lastCardRef.current.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, 0);
  };

  /**
   * Remove an order card from the repeater.
   */
  const removeOrderCard = (orderId) => {
    if (orders.length <= 1) return; // Keep at least one card
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    setOrderTypesMap((prev) => {
      const copy = { ...prev };
      delete copy[orderId];
      return copy;
    });
    setOrderErrors((prev) => {
      const copy = { ...prev };
      delete copy[orderId];
      return copy;
    });
  };

  /**
   * Handle category change for a specific card.
   */
  const handleOrderCategoryChange = (orderId, newCategory) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
            ...o,
            category: newCategory,
            side: 'N/A',
            view: 'N/A',
          }
          : o
      )
    );
    loadTypesForOrder(orderId, newCategory);
  };

  /**
   * Handle diagnostic test type change for a specific card.
   */
  const handleOrderTypeChange = (orderId, selectedVal) => {
    const availableTypes = orderTypesMap[orderId]?.types || [];
    const match = availableTypes.find((t) => (t.value || t.name) === selectedVal);
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
            ...o,
            type: selectedVal,
            charges: match && match.charges !== undefined ? String(match.charges) : o.charges,
          }
          : o
      )
    );
  };

  /**
   * Handle field updates (side, view, charges) for a specific card.
   */
  const handleOrderFieldChange = (orderId, field, value) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, [field]: value } : o)));

    if (field === 'charges') {
      const val = parseInt(value, 10);
      if (value !== '' && (isNaN(val) || val < 0)) {
        setOrderErrors((prev) => ({
          ...prev,
          [orderId]: { ...prev[orderId], charges: 'Charges Cannot Be Negative' },
        }));
      } else if (value !== '' && val > 999999) {
        setOrderErrors((prev) => ({
          ...prev,
          [orderId]: { ...prev[orderId], charges: 'Charges Cannot Exceed 999,999 PKR' },
        }));
      } else {
        setOrderErrors((prev) => ({
          ...prev,
          [orderId]: { ...prev[orderId], charges: null },
        }));
      }
    }
  };

  /**
   * Handle MR Number input changes with integer validation.
   */
  const handleMrNumberChange = (e) => {
    const value = e.target.value;
    setMrNumber(value);

    const trimmedVal = String(value ?? '').trim();
    const val = parseInt(trimmedVal, 10);
    if (trimmedVal !== '' && (!/^\d+$/.test(trimmedVal) || isNaN(val) || val < 1 || val > 2147483647)) {
      setErrors((prev) => ({ ...prev, mrNumber: 'MR Number Must Be Between 1 And 2,147,483,647' }));
    } else {
      setErrors((prev) => ({ ...prev, mrNumber: null }));
    }
  };

  /**
   * Form submission using the bulk diagnostic order backend endpoint.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedMr = String(mrNumber ?? '').trim();
    const mrNum = parseInt(trimmedMr, 10);
    if (!/^\d+$/.test(trimmedMr) || isNaN(mrNum) || mrNum < 1 || mrNum > 2147483647) {
      setToast({ open: true, message: 'Invalid MR Number. Must Be An Integer Up To 2,147,483,647.', severity: 'error' });
      return;
    }

    if (!Array.isArray(orders) || orders.length === 0) {
      setToast({ open: true, message: 'Please Add At Least One Diagnostic Order.', severity: 'error' });
      return;
    }

    // Validate each order in the repeater
    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      if (!o.category || !o.type) {
        setToast({ open: true, message: `Order #${i + 1}: Please Select A Category And Diagnostic Test Type.`, severity: 'error' });
        return;
      }

      const parsedCharges = parseInt(String(o.charges ?? '').trim(), 10);
      if (isNaN(parsedCharges) || parsedCharges < 0 || parsedCharges > 999999) {
        setToast({ open: true, message: `Order #${i + 1}: Charges Must Be A Non-Negative Integer Up To 999,999 PKR.`, severity: 'error' });
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        mrNumber: mrNum,
        orders: orders.map((o) => ({
          category: o.category,
          type: o.type,
          charges: parseInt(String(o.charges).trim(), 10),
          side: o.category === 'X-Ray' ? o.side : 'N/A',
          view: o.category === 'X-Ray' ? o.view : 'N/A',
        })),
      };

      const response = await fetch(buildApiUrl('/api/diagnostic-orders/bulk'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed To Create Orders (Status ${response.status})`);
      }

      const result = await response.json();
      const createdOrders = result.data || [];

      // Trigger consolidated thermal print if enabled
      if (printFromServer && createdOrders.length > 0) {
        try {
          const orderIds = createdOrders.map((o) => o.id);
          const printRes = await fetch(buildApiUrl('/api/diagnostic-orders/bulk-print'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderIds }),
          });
          if (!printRes.ok) {
            console.warn('Server hardware bulk print failed or printer unavailable');
          }
        } catch (pErr) {
          console.error('Error triggering server hardware bulk print:', pErr);
        }
      }

      if (onAdd) {
        onAdd(createdOrders, `${createdOrders.length} Diagnostic Order(s) Saved Successfully!`);
      }
    } catch (err) {
      console.error('Error saving diagnostic orders:', err);
      setToast({
        open: true,
        message: err.message || 'An Error Occurred While Saving The Diagnostic Orders.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ minHeight: '100vh', padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* ======================================================== */}
        {/* CARD 1: Patient Information (Constant across all orders) */}
        {/* ======================================================== */}
        <div
          className="auth-form"
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '100%',
            textAlign: 'left',
            padding: '2.5rem 2rem',
            alignItems: 'stretch',
          }}
        >
          {onBack && (
            <IconButton
              onClick={onBack}
              sx={{
                position: 'absolute',
                top: 14,
                right: 14,
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

          <h2
            style={{
              fontFamily: 'var(--heading), Georgia, serif',
              marginBottom: '20px',
              color: 'hsl(222, 47%, 11%)',
              textAlign: 'center',
              width: '100%',
            }}
          >
            Add New Diagnostic Order
          </h2>

          {/* 2-Column Row: MR Number + Patient Name */}
          <div className="two-column-row">
            <div className="input-group" style={{ flex: 1 }}>
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
                  value={mrNumber}
                  onChange={handleMrNumberChange}
                  required
                  disabled={loading}
                  autoComplete="off"
                  placeholder="Enter MR Number"
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

            <div className="input-group" style={{ flex: 1 }}>
              <PatientNameField patientName={patientName} lookupStatus={patientLookupStatus} />
            </div>
          </div>

          {/* Print from Server Checkbox */}
          <div style={{ marginTop: '12px', width: '100%' }}>
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
        </div>

        {/* ======================================================== */}
        {/* CARDS 2..N: Diagnostic Order Details (Form Array Repeater) */}
        {/* ======================================================== */}
        {orders.map((order, index) => {
          const isLast = index === orders.length - 1;
          const typesState = orderTypesMap[order.id] || { types: [], loading: false };
          const orderErr = orderErrors[order.id]?.charges;

          return (
            <div
              key={order.id}
              ref={isLast ? lastCardRef : null}
              className="auth-form"
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '100%',
                textAlign: 'left',
                padding: '2.5rem 2rem',
                alignItems: 'stretch',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  marginBottom: '16px',
                }}
              >
                <h3
                  style={{
                    fontFamily: 'var(--heading), Georgia, serif',
                    margin: 0,
                    fontSize: '18px',
                    color: 'hsl(222, 47%, 11%)',
                  }}
                >
                  Order #{index + 1} Details
                </h3>

                {orders.length > 1 && (
                  <Button
                    size="small"
                    onClick={() => removeOrderCard(order.id)}
                    disabled={loading}
                    startIcon={<DeleteIcon sx={{ fontSize: '18px !important' }} />}
                    sx={{
                      color: 'hsl(0, 75%, 50%)',
                      background: 'hsla(0, 75%, 50%, 0.08)',
                      border: '1px solid hsla(0, 75%, 50%, 0.3)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      textTransform: 'none',
                      padding: '4px 10px',
                      '&:hover': {
                        background: 'hsla(0, 75%, 50%, 0.16)',
                        borderColor: 'hsl(0, 75%, 50%)',
                      },
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>

              {/* 2-Column: Category & Diagnostic Test Name */}
              <div className="two-column-row">
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label" htmlFor={`order-category-${order.id}`} style={{ fontFamily: 'var(--heading), Georgia, serif' }}>
                    Category
                  </label>
                  <div className="input-with-icon">
                    <LocalHospital className="input-icon" />
                    <select
                      id={`order-category-${order.id}`}
                      name="category"
                      value={order.category}
                      onChange={(e) => handleOrderCategoryChange(order.id, e.target.value)}
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

                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label" htmlFor={`order-type-${order.id}`} style={{ fontFamily: 'var(--heading), Georgia, serif' }}>
                    Diagnostic Test Name
                    {typesState.loading && (
                      <span style={{ fontSize: '11px', color: 'hsl(217, 91%, 60%)', marginLeft: '8px' }}>
                        (Loading Types...)
                      </span>
                    )}
                  </label>
                  <div className="input-with-icon">
                    <Label className="input-icon" />
                    <select
                      id={`order-type-${order.id}`}
                      name="type"
                      value={order.type}
                      onChange={(e) => handleOrderTypeChange(order.id, e.target.value)}
                      required
                      disabled={loading || typesState.loading}
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
                      {typesState.types.map((t) => (
                        <option key={t.value || t.name} value={t.value || t.name}>
                          {t.label || t.name}
                          {t.charges !== undefined ? ` (Rs. ${t.charges})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 2-Column: Side & View (X-Ray only) */}
              {order.category === 'X-Ray' && (
                <div className="two-column-row" style={{ marginTop: '12px' }}>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label className="input-label" htmlFor={`order-side-${order.id}`} style={{ fontFamily: 'var(--heading), Georgia, serif' }}>
                      Side
                    </label>
                    <div className="input-with-icon">
                      <MedicalServices className="input-icon" />
                      <select
                        id={`order-side-${order.id}`}
                        name="side"
                        value={order.side}
                        onChange={(e) => handleOrderFieldChange(order.id, 'side', e.target.value)}
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
                    <label className="input-label" htmlFor={`order-view-${order.id}`} style={{ fontFamily: 'var(--heading), Georgia, serif' }}>
                      View
                    </label>
                    <div className="input-with-icon">
                      <Visibility className="input-icon" />
                      <select
                        id={`order-view-${order.id}`}
                        name="view"
                        value={order.view}
                        onChange={(e) => handleOrderFieldChange(order.id, 'view', e.target.value)}
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

              {/* Charges Input Field */}
              <div className="input-group" style={{ marginTop: '12px', width: '100%' }}>
                <label className="input-label" htmlFor={`order-charges-${order.id}`} style={{ fontFamily: 'var(--heading), Georgia, serif' }}>
                  Charges (PKR)
                </label>
                <div className="input-with-icon">
                  <AttachMoney className="input-icon" />
                  <input
                    id={`order-charges-${order.id}`}
                    name="charges"
                    type="number"
                    min="0"
                    max="999999"
                    step="1"
                    value={order.charges}
                    onChange={(e) => handleOrderFieldChange(order.id, 'charges', e.target.value)}
                    required
                    disabled={loading}
                    placeholder="Enter charges"
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      borderRadius: '8px',
                      border: orderErr ? '1px solid hsl(0, 75%, 50%)' : '1px solid hsla(215, 25%, 80%, 0.6)',
                      background: 'hsla(0, 0%, 100%, 0.85)',
                      fontSize: '15px',
                      color: 'hsl(222, 47%, 11%)',
                    }}
                  />
                </div>
                {orderErr && (
                  <span style={{ color: 'hsl(0, 75%, 50%)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    {orderErr}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* ======================================================== */}
        {/* PLUS BUTTON: Adds another order card at the bottom       */}
        {/* ======================================================== */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '4px', marginBottom: '8px' }}>
          <Button
            variant="contained"
            onClick={addOrderCard}
            disabled={loading}
            startIcon={<AddIcon />}
            sx={{
              background: 'hsl(217, 91%, 60%)',
              color: 'hsl(0, 0%, 100%)',
              fontWeight: 600,
              fontSize: '14px',
              textTransform: 'none',
              padding: '10px 22px',
              borderRadius: '24px',
              boxShadow: '0 4px 12px hsla(217, 91%, 60%, 0.3)',
              '&:hover': {
                background: 'hsl(217, 91%, 50%)',
              },
            }}
          >
            Add Another Test
          </Button>
        </div>

        {/* ======================================================== */}
        {/* STICKY SAVE BUTTON: Centered at bottom of viewport       */}
        {/* ======================================================== */}
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 100,
            width: '100%',
            padding: '16px 0',
            display: 'flex',
            justifyContent: 'center',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        >
          <Button
            variant="contained"
            type="submit"
            disabled={loading}
            sx={{
              minWidth: '280px',
              gap: 1,
              background: 'hsl(222, 65%, 32%)',
              color: 'hsl(0, 0%, 100%)',
              fontWeight: 600,
              fontSize: '16px',
              textTransform: 'none',
              padding: '12px 28px',
              borderRadius: '10px',
              boxShadow: '0 6px 16px hsla(222, 65%, 32%, 0.35)',
              '&:hover': {
                background: 'hsl(222, 65%, 25%)',
              },
            }}
          >
            {loading ? (
              <>
                <CircularProgress size={20} color="inherit" /> Saving Orders...
              </>
            ) : (
              `Save Diagnostic ${orders.length > 1 ? `Orders (${orders.length})` : 'Order'}`
            )}
          </Button>
        </div>
      </form>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseToast} severity={toast.severity} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
