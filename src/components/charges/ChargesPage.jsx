import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Search,
  Clear,
  Add,
  Edit,
  Delete,
  LocalHospital,
} from '@mui/icons-material';
import { buildApiUrl } from '../../config/api';
import '../../styles/Auth.css';

const CATEGORIES = ['All', 'X-Ray', 'Ultrasound', 'PFT', 'ECG', 'Lab'];

/**
 * ChargesPage Component.
 * Comprehensive CRUD management for Diagnostic Charges.
 * Features categorized tabs, responsive search, full form page navigation, and safe deletion.
 */
export default function ChargesPage({ onAddCharge, onEditCharge }) {
  const [chargesList, setChargesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // Dialog State: Delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const searchInputRef = useRef(null);

  // Auto-focus search input on page load
  useEffect(() => {
    searchInputRef.current?.focus();
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const triggerReload = useCallback(() => {
    setIsLoading(true);
    setReloadTrigger((prev) => prev + 1);
  }, []);

  // Fetch charges on mount or reload trigger
  useEffect(() => {
    let isMounted = true;

    async function loadCharges() {
      try {
        const response = await fetch(buildApiUrl('/api/charges'));
        if (!response.ok) {
          throw new Error(`Failed to load charges (status ${response.status})`);
        }
        const data = await response.json();
        if (isMounted && Array.isArray(data)) {
          setChargesList(data);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching diagnostic charges:', err);
          setToast({
            open: true,
            message: err.message || 'Error fetching diagnostic charges.',
            severity: 'error',
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadCharges();

    return () => {
      isMounted = false;
    };
  }, [reloadTrigger]);

  // Compute category counts for tab badges
  const categoryCounts = useMemo(() => {
    const counts = { All: chargesList.length, 'X-Ray': 0, Ultrasound: 0, PFT: 0, ECG: 0, Lab: 0 };
    chargesList.forEach((item) => {
      if (counts[item.category] !== undefined) {
        counts[item.category] += 1;
      }
    });
    return counts;
  }, [chargesList]);

  // Filter charges by selected category tab and search input
  const filteredCharges = useMemo(() => {
    const trimmedQuery = searchTerm.trim().toLowerCase();
    return chargesList.filter((item) => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch =
        !trimmedQuery ||
        item.name.toLowerCase().includes(trimmedQuery) ||
        item.category.toLowerCase().includes(trimmedQuery) ||
        String(item.charges).includes(trimmedQuery) ||
        (item.subtype && item.subtype.toLowerCase().includes(trimmedQuery));
      return matchesCategory && matchesSearch;
    });
  }, [chargesList, selectedCategory, searchTerm]);

  // Handle open Delete dialog
  const handleOpenDelete = (item) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    if (isDeleting) return;
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(buildApiUrl(`/api/charges/${itemToDelete.id}`), {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || 'Failed to delete charge.');
      }

      setToast({
        open: true,
        message: `'${itemToDelete.name}' deleted successfully.`,
        severity: 'success',
      });

      handleCloseDeleteDialog();
      triggerReload();
    } catch (err) {
      console.error('Delete failed:', err);
      setToast({
        open: true,
        message: err.message || 'Failed to delete diagnostic charge.',
        severity: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto 40px auto', padding: '0 16px', boxSizing: 'border-box', minWidth: 0 }}>
      {/* Unified Single Card */}
      <div
        className="glass"
        style={{
          overflow: 'hidden',
          padding: 0,
          width: '100%',
          boxSizing: 'border-box',
          minWidth: 0,
        }}
      >
        {/* Section 1: Top Banner & Header */}
        <div
          style={{
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            borderBottom: '1px solid var(--glass-border)',
          }}
        >
          <div>
            <h2 style={{ fontFamily: 'var(--heading), Georgia, serif', color: 'hsl(222, 47%, 11%)', margin: 0, fontSize: '20px' }}>
              Diagnostic Charges
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Button
              variant="contained"
              onClick={onAddCharge}
              startIcon={<Add />}
              size="small"
              sx={{
                borderRadius: '8px',
                background: 'hsl(217, 91%, 60%)',
                color: '#ffffff',
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: '0 4px 14px hsla(217, 91%, 60%, 0.35)',
                '&:hover': {
                  background: 'hsl(217, 91%, 50%)',
                },
              }}
            >
              Add New Charge
            </Button>
          </div>
        </div>

        {/* Section 2: Controls (Category Tabs & Search Bar) */}
        <div
          style={{
            padding: '24px 24px 28px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            borderBottom: '1px solid var(--glass-border)',
            background: 'hsla(0, 0%, 100%, 0.15)',
          }}
        >
          {/* Category Tabs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              marginTop: '4px',
            }}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              const count = categoryCounts[cat] || 0;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: isSelected
                      ? '1.5px solid hsl(217, 91%, 60%)'
                      : '1px solid hsla(215, 25%, 80%, 0.5)',
                    background: isSelected
                      ? 'hsl(217, 91%, 60%)'
                      : 'hsla(0, 0%, 100%, 0.7)',
                    color: isSelected ? '#ffffff' : 'var(--text-h)',
                    fontWeight: isSelected ? 600 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected
                      ? '0 2px 8px hsla(217, 91%, 60%, 0.3)'
                      : 'none',
                  }}
                >
                  <span>{cat}</span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '18px',
                      height: '18px',
                      padding: '0 5px',
                      borderRadius: '9px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: isSelected
                        ? 'hsla(0, 0%, 100%, 0.25)'
                        : 'hsla(215, 20%, 65%, 0.2)',
                      color: isSelected ? '#ffffff' : 'var(--text-muted, hsl(215, 16%, 47%))',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div style={{ position: 'relative', width: '100%' }}>
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '14px',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted, hsl(215, 16%, 47%))',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <Search style={{ fontSize: '20px' }} />
            </div>

            <input
              ref={searchInputRef}
              autoFocus
              type="text"
              placeholder="Search test name, category, or amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 40px 11px 44px',
                borderRadius: '10px',
                border: '1px solid hsla(215, 25%, 80%, 0.6)',
                background: 'hsla(0, 0%, 100%, 0.85)',
                fontSize: '14px',
                color: 'var(--text-h)',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'var(--sans)',
              }}
            />

            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: '12px',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted, hsl(215, 16%, 47%))',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                }}
                aria-label="Clear search"
              >
                <Clear style={{ fontSize: '18px' }} />
              </button>
            )}
          </div>
        </div>

        {/* Section 3: Main Table Content */}
        <div style={{ overflowX: 'auto', width: '100%', minWidth: 0, paddingTop: '16px' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontFamily: 'var(--sans)',
              marginTop: 0,
            }}
          >
            <thead>
              <tr
                style={{
                  background: 'var(--bg, #f8fafc)',
                  borderBottom: '2px solid var(--glass-border)',
                }}
              >
                <th
                  style={{
                    padding: '12px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    color: 'var(--text-h, #0f172a)',
                    fontFamily: 'var(--heading), Georgia, serif',
                    backgroundColor: 'transparent',
                  }}
                >
                  Category
                </th>
                <th
                  style={{
                    padding: '12px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    color: 'var(--text-h, #0f172a)',
                    fontFamily: 'var(--heading), Georgia, serif',
                    backgroundColor: 'transparent',
                  }}
                >
                  Subtype
                </th>
                <th
                  style={{
                    padding: '12px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    color: 'var(--text-h, #0f172a)',
                    fontFamily: 'var(--heading), Georgia, serif',
                    backgroundColor: 'transparent',
                  }}
                >
                  Diagnostic Test Name
                </th>
                <th
                  style={{
                    padding: '12px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    color: 'var(--text-h, #0f172a)',
                    fontFamily: 'var(--heading), Georgia, serif',
                    textAlign: 'right',
                    backgroundColor: 'transparent',
                  }}
                >
                  Charges
                </th>
                <th
                  style={{
                    padding: '12px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    color: 'var(--text-h, #0f172a)',
                    fontFamily: 'var(--heading), Georgia, serif',
                    textAlign: 'center',
                    width: '100px',
                    backgroundColor: 'transparent',
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px',
                        color: 'var(--text-muted, hsl(215, 16%, 47%))',
                      }}
                    >
                      <CircularProgress size={32} sx={{ color: 'hsl(217, 91%, 60%)' }} />
                      <span style={{ fontSize: '15px', fontWeight: 500 }}>
                        Loading Diagnostic Charges...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredCharges.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                        color: 'var(--text-muted, hsl(215, 16%, 47%))',
                      }}
                    >
                      <LocalHospital style={{ fontSize: '40px', color: 'hsla(215, 20%, 65%, 0.4)' }} />
                      <span style={{ fontSize: '16px', fontWeight: 600 }}>
                        No Diagnostic Charges Found
                      </span>
                      <span style={{ fontSize: '13px' }}>
                        {searchTerm
                          ? 'Try Adjusting Your Search Term Or Category Filter.'
                          : 'Click "Add New Charge" To Create Your First Record.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCharges.map((item, index) => {
                  const isEven = index % 2 === 0;

                  const badgeColors = {
                    'X-Ray': { bg: 'hsl(217, 85%, 45%)', text: 'hsl(0, 0%, 100%)' },
                    Ultrasound: { bg: 'hsl(142, 70%, 35%)', text: 'hsl(0, 0%, 100%)' },
                    PFT: { bg: 'hsl(280, 65%, 42%)', text: 'hsl(0, 0%, 100%)' },
                    ECG: { bg: 'hsl(25, 90%, 42%)', text: 'hsl(0, 0%, 100%)' },
                    Lab: { bg: 'hsl(340, 75%, 45%)', text: 'hsl(0, 0%, 100%)' },
                  };

                  const badge = badgeColors[item.category] || {
                    bg: 'hsl(215, 25%, 40%)',
                    text: 'hsl(0, 0%, 100%)',
                  };

                  return (
                    <tr
                      key={item.id}
                      style={{
                        background: isEven ? 'transparent' : 'hsla(215, 30%, 97%, 0.4)',
                        borderBottom: '1px solid hsla(215, 25%, 85%, 0.5)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'hsla(217, 91%, 60%, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isEven
                          ? 'transparent'
                          : 'hsla(215, 30%, 97%, 0.4)';
                      }}
                    >
                      {/* Category Badge */}
                      <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            background: badge.bg,
                            color: badge.text,
                            letterSpacing: '0.3px',
                          }}
                        >
                          {item.category}
                        </span>
                      </td>

                      {/* Subtype Badge */}
                      <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                        {item.subtype ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: item.subtype === 'Routine'
                                ? 'hsl(142, 70%, 35%)'
                                : item.subtype === 'Special'
                                  ? 'hsl(25, 90%, 42%)'
                                  : 'hsl(0, 75%, 45%)',
                              color: 'hsl(0, 0%, 100%)',
                            }}
                          >
                            {item.subtype}
                          </span>
                        ) : (
                          <span style={{ color: 'hsl(215, 16%, 60%)', fontSize: '12px' }}>—</span>
                        )}
                      </td>

                      {/* Test Name */}
                      <td
                        style={{
                          padding: '14px 20px',
                          fontWeight: 600,
                          color: 'var(--text-h)',
                          fontSize: '14px',
                        }}
                      >
                        {item.name}
                      </td>

                      {/* Charges Amount */}
                      <td
                        style={{
                          padding: '14px 20px',
                          textAlign: 'right',
                          fontWeight: 700,
                          fontSize: '15px',
                          color: 'hsl(217, 91%, 50%)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        Rs. {Number(item.charges).toLocaleString()}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <Tooltip title="Edit Charge" arrow>
                            <span
                              onClick={() => onEditCharge && onEditCharge(item)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'hsla(217, 91%, 60%, 0.12)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'hsla(217, 91%, 60%, 0.25)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'hsla(217, 91%, 60%, 0.12)';
                              }}
                              role="button"
                              aria-label={`Edit ${item.name}`}
                              tabIndex={0}
                            >
                              <Edit style={{ fontSize: '18px', color: 'hsl(217, 91%, 55%)' }} />
                            </span>
                          </Tooltip>

                          <Tooltip title="Delete Charge" arrow>
                            <span
                              onClick={() => handleOpenDelete(item)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'hsla(0, 75%, 55%, 0.15)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'hsla(0, 75%, 55%, 0.28)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'hsla(0, 75%, 55%, 0.15)';
                              }}
                              role="button"
                              aria-label={`Delete ${item.name}`}
                              tabIndex={0}
                            >
                              <Delete style={{ fontSize: '18px', color: 'hsl(0, 75%, 50%)' }} />
                            </span>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info bar */}
        <div
          style={{
            padding: '12px 24px',
            background: 'hsla(215, 30%, 94%, 0.6)',
            borderTop: '1px solid var(--glass-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13px',
            color: 'var(--text)',
            fontFamily: 'var(--sans)',
          }}
        >
          <span>
            Showing <strong>{filteredCharges.length}</strong> of <strong>{chargesList.length}</strong> Total Charges
          </span>
          {selectedCategory !== 'All' && (
            <span>
              Category Filter: <strong>{selectedCategory}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog with Semantic Colors */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        transitionDuration={0}
        TransitionProps={{ timeout: 0 }}
        PaperProps={{
          className: 'glass',
          style: {
            padding: '16px',
            borderRadius: '16px',
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            transition: 'none',
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: 'var(--heading), Georgia, serif',
            color: 'hsl(0, 75%, 45%)',
            fontWeight: 700,
          }}
        >
          Delete Diagnostic Charge
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'var(--text)', fontSize: '15px' }}>
            Are you sure you want to delete{' '}
            <strong style={{ color: 'var(--text-h)' }}>
              {itemToDelete?.name} ({itemToDelete?.category})
            </strong>
            ? This action cannot be undone and will remove it from dropdown selections.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ padding: '12px 16px', gap: '8px' }}>
          <Button
            onClick={handleCloseDeleteDialog}
            disabled={isDeleting}
            sx={{ color: 'var(--text-h)', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            disabled={isDeleting}
            sx={{
              background: 'hsl(0, 75%, 50%)',
              color: '#ffffff',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: '8px',
              padding: '6px 18px',
              '&:hover': { background: 'hsl(0, 75%, 40%)' },
            }}
          >
            {isDeleting ? <CircularProgress size={20} sx={{ color: '#ffffff' }} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast Feedback */}
      <Snackbar
        open={toast.open}
        autoHideDuration={5000}
        transitionDuration={0}
        TransitionProps={{ timeout: 0 }}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          variant="filled"
          sx={{ width: '100%', borderRadius: '8px', fontWeight: 500 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
