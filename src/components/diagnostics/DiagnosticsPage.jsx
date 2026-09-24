import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Button,
  IconButton,
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
  Label,
  Payments,
  FilterList,
} from '@mui/icons-material';
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

const CATEGORIES = ['All', 'X-Ray', 'Ultrasound', 'PFT', 'ECG'];

/**
 * DiagnosticsPage Component.
 * Comprehensive CRUD management for Diagnostic Charges.
 * Features categorized tabs, responsive search, modal create/edit forms, and safe deletion.
 */
export default function DiagnosticsPage() {
  const [chargesList, setChargesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // Dialog State: Create / Edit
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    category: 'X-Ray',
    name: '',
    charges: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog State: Delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const searchInputRef = useRef(null);

  // Auto-focus search input on page load
  useEffect(() => {
    searchInputRef.current?.focus();
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
    const counts = { All: chargesList.length, 'X-Ray': 0, Ultrasound: 0, PFT: 0, ECG: 0 };
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
      const matchesSearch = !trimmedQuery || item.name.toLowerCase().includes(trimmedQuery) || item.category.toLowerCase().includes(trimmedQuery) || String(item.charges).includes(trimmedQuery);
      return matchesCategory && matchesSearch;
    });
  }, [chargesList, selectedCategory, searchTerm]);

  // Handle open Add dialog
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      category: selectedCategory === 'All' ? 'X-Ray' : selectedCategory,
      name: '',
      charges: '',
    });
    setFormDialogOpen(true);
  };

  // Handle open Edit dialog
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      category: item.category,
      name: item.name,
      charges: String(item.charges),
    });
    setFormDialogOpen(true);
  };

  const handleCloseFormDialog = () => {
    if (isSubmitting) return;
    setFormDialogOpen(false);
    setEditingItem(null);
  };

  // Handle Form Submission (Add or Edit)
  const handleSubmitForm = async (e) => {
    e.preventDefault();

    const sanitizedName = sanitizeInput(formData.name);
    if (!sanitizedName) {
      setToast({ open: true, message: 'Please enter a valid diagnostic test name.', severity: 'error' });
      return;
    }

    const trimmedCharges = String(formData.charges).trim();
    if (trimmedCharges === '' || !/^\d+$/.test(trimmedCharges)) {
      setToast({ open: true, message: 'Please enter a valid non-negative charge amount.', severity: 'error' });
      return;
    }

    const parsedCharges = parseInt(trimmedCharges, 10);
    if (parsedCharges < 0 || parsedCharges > 99999) {
      setToast({ open: true, message: 'Charges must be between 0 and 99999 PKR.', severity: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const isEdit = Boolean(editingItem);
      const url = isEdit
        ? buildApiUrl(`/api/charges/${editingItem.id}`)
        : buildApiUrl('/api/charges');
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: formData.category,
          name: sanitizedName,
          charges: parsedCharges,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Operation failed.');
      }

      setToast({
        open: true,
        message: isEdit ? 'Diagnostic charge updated successfully.' : 'New diagnostic charge created successfully.',
        severity: 'success',
      });

      handleCloseFormDialog();
      triggerReload();
    } catch (err) {
      console.error('Failed to save charge:', err);
      setToast({
        open: true,
        message: err.message || 'Failed to save diagnostic charge.',
        severity: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px 40px' }}>
      {/* Top Banner & Header */}
      <div
        className="glass"
        style={{
          padding: '24px 32px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2>Diagnostic Charges</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button
            variant="contained"
            onClick={handleOpenAdd}
            startIcon={<Add />}
            sx={{
              borderRadius: '8px',
              background: 'hsl(217, 91%, 60%)',
              color: '#ffffff',
              fontFamily: 'var(--heading), Georgia, serif',
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

      {/* Controls: Category Tabs & Search Bar */}
      <div
        className="glass"
        style={{
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Category Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--heading), Georgia, serif',
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--text)',
              marginRight: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <FilterList style={{ fontSize: '18px' }} /> Category:
          </span>

          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  background: isSelected ? 'hsl(217, 91%, 60%)' : 'hsla(215, 30%, 94%, 0.7)',
                  color: isSelected ? '#ffffff' : 'var(--text-h)',
                  border: isSelected ? '1px solid hsl(217, 91%, 55%)' : '1px solid var(--glass-border)',
                  borderRadius: '20px',
                  padding: '6px 16px',
                  fontFamily: 'var(--heading), Georgia, serif',
                  fontSize: '14px',
                  fontWeight: isSelected ? 600 : 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>{cat}</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '20px',
                    height: '20px',
                    padding: '0 6px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    // Darker background with lighter text for badges
                    background: isSelected ? 'hsl(217, 95%, 40%)' : 'hsl(215, 25%, 35%)',
                    color: '#f8fafc',
                  }}
                >
                  {categoryCounts[cat] || 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Field with Fixed Inside Icon */}
        <div style={{ maxWidth: '480px', width: '100%' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label
              className="input-label"
              htmlFor="diagnostics-search-input"
              style={{ fontFamily: 'var(--heading), Georgia, serif' }}
            >
              Search Charges
            </label>
            <div className="input-with-icon">
              <Search className="input-icon" />
              <input
                id="diagnostics-search-input"
                ref={searchInputRef}
                type="text"
                placeholder="Search by test name, category, or charges..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                maxLength={100}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 40px',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '14px',
                  color: 'var(--text-h)',
                  outline: 'none',
                }}
              />
              {searchTerm && (
                <IconButton
                  size="small"
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    color: '#64748b',
                  }}
                  aria-label="Clear search"
                >
                  <Clear fontSize="small" />
                </IconButton>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div
        className="glass"
        style={{
          overflow: 'hidden',
          borderRadius: '16px',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontFamily: 'var(--sans)',
            }}
          >
            <thead>
              <tr
                style={{
                  background: 'hsla(215, 30%, 94%, 0.85)',
                  borderBottom: '2px solid var(--glass-border)',
                }}
              >
                <th
                  style={{
                    padding: '16px 24px',
                    fontFamily: 'var(--heading), Georgia, serif',
                    fontWeight: 700,
                    fontSize: '15px',
                    color: 'var(--text-h)',
                    width: '20%',
                  }}
                >
                  Category
                </th>
                <th
                  style={{
                    padding: '16px 24px',
                    fontFamily: 'var(--heading), Georgia, serif',
                    fontWeight: 700,
                    fontSize: '15px',
                    color: 'var(--text-h)',
                    width: '45%',
                  }}
                >
                  Diagnostic Test Name
                </th>
                <th
                  style={{
                    padding: '16px 24px',
                    fontFamily: 'var(--heading), Georgia, serif',
                    fontWeight: 700,
                    fontSize: '15px',
                    color: 'var(--text-h)',
                    width: '20%',
                  }}
                >
                  Charges (PKR)
                </th>
                <th
                  style={{
                    padding: '16px 24px',
                    fontFamily: 'var(--heading), Georgia, serif',
                    fontWeight: 700,
                    fontSize: '15px',
                    color: 'var(--text-h)',
                    textAlign: 'center',
                    width: '15%',
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                      <CircularProgress size={36} sx={{ color: 'hsl(217, 91%, 60%)' }} />
                      <span style={{ color: 'var(--text)', fontSize: '15px' }}>Loading Diagnostic Charges...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCharges.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text)', fontSize: '16px', margin: 0 }}>
                      No diagnostic charges found matching your criteria.
                    </p>
                    <Button
                      variant="text"
                      onClick={handleOpenAdd}
                      sx={{
                        marginTop: '12px',
                        color: 'hsl(217, 91%, 60%)',
                        textTransform: 'none',
                        fontFamily: 'var(--heading), Georgia, serif',
                        fontWeight: 600,
                      }}
                    >
                      + Add New Diagnostic Charge
                    </Button>
                  </td>
                </tr>
              ) : (
                filteredCharges.map((item, idx) => {
                  // Badge styling per category with darker background and lighter text
                  let badgeBg = 'hsl(215, 25%, 35%)';
                  let badgeColor = '#f8fafc';
                  if (item.category === 'X-Ray') {
                    badgeBg = 'hsl(220, 60%, 35%)';
                  } else if (item.category === 'Ultrasound') {
                    badgeBg = 'hsl(170, 70%, 28%)';
                  } else if (item.category === 'PFT') {
                    badgeBg = 'hsl(270, 50%, 35%)';
                  } else if (item.category === 'ECG') {
                    badgeBg = 'hsl(340, 65%, 35%)';
                  }

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid var(--glass-border)',
                        background: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.15)',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.65)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.15)';
                      }}
                    >
                      {/* Category */}
                      <td style={{ padding: '14px 24px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            background: badgeBg,
                            color: badgeColor,
                            letterSpacing: '0.3px',
                          }}
                        >
                          {item.category}
                        </span>
                      </td>

                      {/* Name */}
                      <td
                        style={{
                          padding: '14px 24px',
                          verticalAlign: 'middle',
                          fontWeight: 600,
                          color: 'var(--text-h)',
                          fontSize: '15px',
                        }}
                      >
                        {item.name}
                      </td>

                      {/* Charges */}
                      <td
                        style={{
                          padding: '14px 24px',
                          verticalAlign: 'middle',
                          fontFamily: 'var(--mono)',
                          fontSize: '15px',
                          fontWeight: 700,
                          color: 'hsl(217, 80%, 45%)',
                        }}
                      >
                        Rs. {Number(item.charges).toLocaleString()}
                      </td>

                      {/* Actions */}
                      <td
                        style={{
                          padding: '14px 24px',
                          verticalAlign: 'middle',
                          textAlign: 'center',
                        }}
                      >
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            justifyContent: 'center',
                          }}
                        >
                          {/* Circular icon container without scaling the icon */}
                          <Tooltip title="Edit Diagnostic Charge">
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                background: 'hsla(217, 91%, 60%, 0.15)',
                                cursor: 'pointer',
                                transition: 'background 0.2s',
                              }}
                              onClick={() => handleOpenEdit(item)}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'hsla(217, 91%, 60%, 0.3)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'hsla(217, 91%, 60%, 0.15)';
                              }}
                              role="button"
                              aria-label={`Edit ${item.name}`}
                              tabIndex={0}
                            >
                              <Edit style={{ fontSize: '18px', color: 'hsl(217, 91%, 50%)' }} />
                            </span>
                          </Tooltip>

                          <Tooltip title="Delete Diagnostic Charge">
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                background: 'hsla(0, 75%, 55%, 0.15)',
                                cursor: 'pointer',
                                transition: 'background 0.2s',
                              }}
                              onClick={() => handleOpenDelete(item)}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'hsla(0, 75%, 55%, 0.3)';
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
            Showing <strong>{filteredCharges.length}</strong> of <strong>{chargesList.length}</strong> total charges
          </span>
          {selectedCategory !== 'All' && (
            <span>
              Category Filter: <strong>{selectedCategory}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Modal Dialog: Add / Edit Diagnostic Charge */}
      <Dialog
        open={formDialogOpen}
        onClose={handleCloseFormDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          className: 'glass',
          style: {
            padding: '20px',
            borderRadius: '16px',
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: 'var(--heading), Georgia, serif',
            color: 'var(--text-h)',
            fontWeight: 700,
            fontSize: '22px',
            paddingBottom: '8px',
          }}
        >
          {editingItem ? 'Edit Diagnostic Charge' : 'Add New Diagnostic Charge'}
        </DialogTitle>

        <form onSubmit={handleSubmitForm}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '12px !important' }}>
            {/* Category Dropdown */}
            <div className="input-group">
              <label
                className="input-label"
                htmlFor="charge-category-select"
                style={{ fontFamily: 'var(--heading), Georgia, serif' }}
              >
                Category
              </label>
              <div className="input-with-icon">
                <LocalHospital className="input-icon" />
                <select
                  id="charge-category-select"
                  name="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  disabled={isSubmitting}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 40px',
                    borderRadius: '8px',
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '15px',
                    color: 'var(--text-h)',
                  }}
                >
                  <option value="X-Ray">X-Ray</option>
                  <option value="Ultrasound">Ultrasound</option>
                  <option value="PFT">PFT</option>
                  <option value="ECG">ECG</option>
                </select>
              </div>
            </div>

            {/* Test Name Input */}
            <div className="input-group">
              <label
                className="input-label"
                htmlFor="charge-name-input"
                style={{ fontFamily: 'var(--heading), Georgia, serif' }}
              >
                Diagnostic Test Name
              </label>
              <div className="input-with-icon">
                <Label className="input-icon" />
                <input
                  id="charge-name-input"
                  name="name"
                  type="text"
                  placeholder="e.g. LS Spine, Whole Abdomen, Pelvis"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  onBlur={(e) => setFormData({ ...formData, name: sanitizeInput(e.target.value) })}
                  maxLength={100}
                  disabled={isSubmitting}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 40px',
                    borderRadius: '8px',
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '15px',
                    color: 'var(--text-h)',
                  }}
                />
              </div>
            </div>

            {/* Charges Input (PKR) */}
            <div className="input-group">
              <label
                className="input-label"
                htmlFor="charge-amount-input"
                style={{ fontFamily: 'var(--heading), Georgia, serif' }}
              >
                Charges In PKR
              </label>
              <div className="input-with-icon">
                <Payments className="input-icon" />
                <input
                  id="charge-amount-input"
                  name="charges"
                  type="number"
                  min="0"
                  max="99999"
                  step="1"
                  placeholder="e.g. 600, 1200"
                  value={formData.charges}
                  onChange={(e) => setFormData({ ...formData, charges: e.target.value })}
                  disabled={isSubmitting}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 40px',
                    borderRadius: '8px',
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '15px',
                    color: 'var(--text-h)',
                  }}
                />
              </div>
            </div>
          </DialogContent>

          <DialogActions sx={{ padding: '16px 24px', gap: '8px' }}>
            <Button
              type="button"
              onClick={handleCloseFormDialog}
              disabled={isSubmitting}
              sx={{
                color: 'var(--text-h)',
                fontFamily: 'var(--heading), Georgia, serif',
                textTransform: 'none',
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              sx={{
                background: 'hsl(217, 91%, 60%)',
                color: '#ffffff',
                fontFamily: 'var(--heading), Georgia, serif',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: '8px',
                padding: '8px 20px',
                '&:hover': { background: 'hsl(217, 91%, 50%)' },
              }}
            >
              {isSubmitting ? (
                <CircularProgress size={20} sx={{ color: '#ffffff' }} />
              ) : editingItem ? (
                'Update Charge'
              ) : (
                'Save Charge'
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog with Semantic Colors */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        PaperProps={{
          className: 'glass',
          style: {
            padding: '16px',
            borderRadius: '16px',
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
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
