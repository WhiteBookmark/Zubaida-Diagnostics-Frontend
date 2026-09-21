import { useState, useEffect, useRef } from 'react';
import { Button, Snackbar, Alert, IconButton, CircularProgress, Box, Typography, Tooltip } from '@mui/material';
import { Badge, Description, Person } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ImageIcon from '@mui/icons-material/Image';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { buildApiUrl } from '../../config/api';
import '../../styles/Auth.css';

/**
 * Compresses an image file if needed to prevent memory leaks and excessive payloads.
 *
 * @param {File} file - The file to compress.
 * @returns {Promise<File>} Compressed file or original if non-image/small.
 */
async function compressImageFile(file) {
  if (!file || typeof file !== 'object') return file;

  const isImage = file.type?.startsWith('image/') || /\.(bmp|png|jpe?g|webp|tiff)$/i.test(file.name || '');
  if (!isImage) return file;

  return new Promise((resolve) => {
    if (file.size < 500 * 1024 && (file.type === 'image/jpeg' || file.type === 'image/webp')) {
      return resolve(file);
    }

    const tempUrl = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      URL.revokeObjectURL(tempUrl);
      try {
        const MAX_DIM = 2200;
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width <= 0 || height <= 0) return resolve(file);

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return resolve(file);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) return resolve(file);
            const baseName = (file.name || `scan-${Date.now()}`).replace(/\.[^/.]+$/, '');
            const optimizedFile = new File([blob], `${baseName}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(optimizedFile);
          },
          'image/jpeg',
          0.88
        );
      } catch (err) {
        console.warn('[EditDocument] Image compression fallback to original:', err);
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(tempUrl);
      resolve(file);
    };

    img.src = tempUrl;
  });
}

/**
 * EditDocument Component
 * Allows editing document metadata (MR Number reassignment, Document Type)
 * and optionally uploading a replacement file. Patient name is read-only and
 * dynamically resolved from the MR Number.
 *
 * @param {Object} props
 * @param {Object} props.record - Document record object
 * @param {Function} props.onBack - Callback to return to document list
 * @param {Function} props.onSave - Callback invoked after successful save
 */
export default function EditDocument({ record, onBack, onSave }) {
  const [formData, setFormData] = useState({
    mrNumber: record?.patient?.mrNumber ? String(record.patient.mrNumber) : '',
    type: record?.type || '',
  });

  const [patientName, setPatientName] = useState(record?.patient?.name || '');
  const [patientLookupStatus, setPatientLookupStatus] = useState(''); // 'loading', 'found', 'notFound'
  const [replacementFile, setReplacementFile] = useState(null);
  const [replacementPreviewUrl, setReplacementPreviewUrl] = useState(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const lookupTimeoutRef = useRef(null);

  // Clean up object URL on unmount or file replacement change
  useEffect(() => {
    return () => {
      if (replacementPreviewUrl) {
        try {
          URL.revokeObjectURL(replacementPreviewUrl);
        } catch (err) {
          void err;
        }
      }
    };
  }, [replacementPreviewUrl]);

  // Debounced asynchronous lookup of patient name when MR Number changes
  useEffect(() => {
    let isCancelled = false;
    const trimmedMr = formData.mrNumber.trim();

    if (lookupTimeoutRef.current) {
      clearTimeout(lookupTimeoutRef.current);
    }

    lookupTimeoutRef.current = setTimeout(async () => {
      if (isCancelled) return;

      if (!trimmedMr) {
        setPatientName('');
        setPatientLookupStatus('');
        return;
      }

      // If matches initial record MR number, use initial patient name directly
      if (record?.patient?.mrNumber && Number(trimmedMr) === Number(record.patient.mrNumber)) {
        setPatientName(record.patient.name || '');
        setPatientLookupStatus('found');
        return;
      }

      // Only query if valid positive integer
      if (!/^\d+$/.test(trimmedMr)) {
        setPatientName('');
        setPatientLookupStatus('notFound');
        return;
      }

      setPatientLookupStatus('loading');
      try {
        const response = await fetch(buildApiUrl(`api/patients?search=${encodeURIComponent(trimmedMr)}`));
        if (!response.ok) throw new Error('Failed to search patient');
        const result = await response.json();
        const patientList = Array.isArray(result) ? result : result.data || [];
        const match = patientList.find(p => Number(p.mrNumber) === Number(trimmedMr));
        if (!isCancelled) {
          if (match) {
            setPatientName(match.name);
            setPatientLookupStatus('found');
          } else {
            setPatientName('');
            setPatientLookupStatus('notFound');
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('[EditDocument] Error resolving patient:', err);
          setPatientLookupStatus('notFound');
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      if (lookupTimeoutRef.current) {
        clearTimeout(lookupTimeoutRef.current);
      }
    };
  }, [formData.mrNumber, record]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setIsProcessingFile(true);
    try {
      const compressed = await compressImageFile(selected);
      if (replacementPreviewUrl) {
        try { URL.revokeObjectURL(replacementPreviewUrl); } catch (err) { void err; }
      }

      const isImgOrPdf = compressed.type?.startsWith('image/') || compressed.type === 'application/pdf';
      const previewUrl = isImgOrPdf ? URL.createObjectURL(compressed) : null;

      setReplacementFile(compressed);
      setReplacementPreviewUrl(previewUrl);
      setToast({
        open: true,
        message: 'Replacement file selected and ready.',
        severity: 'info',
      });
    } catch (err) {
      console.error('[EditDocument] Error processing replacement file:', err);
      setToast({
        open: true,
        message: 'Failed to process selected file.',
        severity: 'error',
      });
    } finally {
      setIsProcessingFile(false);
      e.target.value = '';
    }
  };

  const handleRemoveReplacementFile = () => {
    if (replacementPreviewUrl) {
      try { URL.revokeObjectURL(replacementPreviewUrl); } catch (err) { void err; }
    }
    setReplacementFile(null);
    setReplacementPreviewUrl(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedMr = formData.mrNumber.trim();
    if (!trimmedMr) {
      setToast({ open: true, message: 'Please provide a valid MR Number.', severity: 'error' });
      return;
    }

    const mrNum = parseInt(trimmedMr, 10);
    if (isNaN(mrNum) || mrNum < 1 || mrNum > 2147483647) {
      setToast({ open: true, message: 'MR Number must be a valid integer between 1 and 2147483647.', severity: 'error' });
      return;
    }

    if (!formData.type.trim()) {
      setToast({ open: true, message: 'Please select a Document Type.', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      const payload = new FormData();
      payload.append('mrNumber', String(mrNum));
      payload.append('type', formData.type.trim());

      if (replacementFile) {
        payload.append('file', replacementFile);
      }

      const response = await fetch(buildApiUrl(`api/documents/${record.id}`), {
        method: 'PUT',
        body: payload,
      });

      if (!response.ok) {
        let errorMsg = 'Failed to update document.';
        try {
          const errData = await response.json();
          errorMsg = errData.message || errorMsg;
        } catch (err) {
          void err;
        }
        throw new Error(errorMsg);
      }

      if (onSave) {
        onSave();
      }
    } catch (err) {
      console.error('[EditDocument] Submit error:', err);
      setToast({
        open: true,
        message: err.message || 'Error updating document record.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseToast = () => {
    setToast(prev => ({ ...prev, open: false }));
  };

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

        <h2>Edit Document Record</h2>

        {/* MR Number Field */}
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
              autoFocus
              required
              disabled={loading}
              placeholder="Enter MR Number"
            />
          </div>
        </div>

        {/* Patient Name (Read-Only, Derived from MR Number) */}
        <div className="input-group">
          <label className="input-label" htmlFor="patientName">
            Patient Name
            {patientLookupStatus === 'loading' && (
              <span style={{ fontSize: '11px', color: 'var(--primary, hsl(221, 83%, 53%))', marginLeft: '8px' }}>
                (Verifying MR...)
              </span>
            )}
            {patientLookupStatus === 'notFound' && (
              <span style={{ fontSize: '11px', color: 'hsl(0, 72%, 51%)', marginLeft: '8px' }}>
                (No patient found with this MR)
              </span>
            )}
          </label>
          <div className="input-with-icon">
            <Person className="input-icon" />
            <input
              id="patientName"
              name="patientName"
              type="text"
              value={patientName || 'Patient name not found'}
              disabled
              style={{
                backgroundColor: 'hsl(215, 25%, 95%)',
                color: patientName ? 'var(--text)' : 'hsl(0, 72%, 51%)',
                cursor: 'not-allowed',
                fontStyle: patientName ? 'normal' : 'italic',
              }}
            />
          </div>
          <Typography variant="caption" sx={{ color: 'hsl(215, 16%, 47%)', mt: 0.5, display: 'block' }}>
            Patient Name is determined by MR Number.
          </Typography>
        </div>

        {/* Document Type Dropdown */}
        <div className="input-group">
          <label className="input-label" htmlFor="type">Document Type</label>
          <div className="input-with-icon">
            <Description className="input-icon" />
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              disabled={loading}
            >
              <option value="" disabled>Select Document Type</option>
              <option value="X-Ray">X-Ray</option>
              <option value="Ultrasound">Ultrasound</option>
              <option value="Lab Result">Lab Result</option>
              <option value="Prescription">Prescription</option>
              <option value="PFT">PFT</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Current & Replacement File Section */}
        <div className="input-group">
          <label className="input-label">Document File</label>
          <Box
            sx={{
              background: 'hsl(215, 30%, 96%)',
              border: '1px solid hsl(214, 32%, 91%)',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            {/* Existing File Info */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InsertDriveFileIcon sx={{ color: 'hsl(215, 16%, 47%)', fontSize: 22 }} />
              <Typography
                variant="body2"
                sx={{
                  color: 'hsl(222, 47%, 11%)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}
              >
                <span style={{ fontWeight: 600 }}>Current File:</span> {record?.fileName || 'No file recorded'}
              </Typography>
            </Box>

            {/* Replacement File Preview / Upload Trigger */}
            {replacementFile ? (
              <Box
                sx={{
                  background: 'hsl(0, 0%, 100%)',
                  border: '1px solid hsl(221, 83%, 53%)',
                  borderRadius: '6px',
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
                  {replacementFile.type?.startsWith('image/') && replacementPreviewUrl ? (
                    <img
                      src={replacementPreviewUrl}
                      alt="Replacement preview"
                      style={{
                        width: '38px',
                        height: '38px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        border: '1px solid hsl(214, 32%, 85%)',
                      }}
                    />
                  ) : replacementFile.type === 'application/pdf' ? (
                    <PictureAsPdfIcon sx={{ color: 'hsl(0, 72%, 51%)', fontSize: 32 }} />
                  ) : replacementFile.type?.startsWith('image/') ? (
                    <ImageIcon sx={{ color: 'hsl(217, 91%, 60%)', fontSize: 32 }} />
                  ) : (
                    <InsertDriveFileIcon sx={{ color: 'hsl(215, 16%, 47%)', fontSize: 32 }} />
                  )}

                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: 'hsl(222, 47%, 11%)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {replacementFile.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'hsl(215, 16%, 47%)' }}>
                      Replacement ({(replacementFile.size / 1024).toFixed(1)} KB)
                    </Typography>
                  </Box>
                </Box>

                <Tooltip title="Cancel replacement">
                  <IconButton
                    size="small"
                    onClick={handleRemoveReplacementFile}
                    disabled={loading || isProcessingFile}
                    sx={{ color: 'hsl(0, 72%, 51%)' }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  variant="outlined"
                  component="label"
                  size="small"
                  disabled={loading || isProcessingFile}
                  startIcon={<CloudUploadIcon />}
                  sx={{ textTransform: 'none', borderRadius: '6px' }}
                >
                  Replace File
                  <input
                    type="file"
                    hidden
                    accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileChange}
                    disabled={loading || isProcessingFile}
                  />
                </Button>
                <Typography variant="caption" sx={{ color: 'hsl(215, 16%, 47%)' }}>
                  Optional — Leave untouched to keep current file
                </Typography>
              </Box>
            )}
          </Box>
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '16px', width: '100%' }}>
          <Button
            variant="contained"
            fullWidth
            type="submit"
            disabled={loading || isProcessingFile}
            sx={{ gap: 1 }}
          >
            {loading ? (
              <>
                <CircularProgress size={20} color="inherit" />
                Saving Changes...
              </>
            ) : (
              'Save Changes'
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
