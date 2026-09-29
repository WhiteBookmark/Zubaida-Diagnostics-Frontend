import { useState, useEffect } from 'react';
import { Button, Snackbar, Alert, IconButton, CircularProgress, Box, Typography, Tooltip } from '@mui/material';
import { Badge, Description, LocalHospital, SwapHoriz, Visibility, Biotech } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ImageIcon from '@mui/icons-material/Image';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { buildApiUrl } from '../../config/api';
import { XRAY_TYPES, XRAY_SIDES, XRAY_VIEWS, ULTRASOUND_TYPES } from '../../constants/documentTypes';
import usePatientLookup from '../../hooks/usePatientLookup';
import PatientNameField from '../common/PatientNameField';
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
 * and optionally uploading a replacement file. Features a live large document
 * preview side-panel matching AddDocument.
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
    xrayType: record?.xrayDetail?.xrayType || '',
    side: record?.xrayDetail?.side || 'N/A',
    view: record?.xrayDetail?.view || 'N/A',
    ultrasoundType: record?.ultrasoundDetail?.ultrasoundType || '',
  });

  const { patientName, lookupStatus: patientLookupStatus } = usePatientLookup(
    formData.mrNumber,
    record?.patient || null
  );

  // Dynamic types fetched from DiagnosticCharge table with static fallbacks
  const [dynamicXrayTypes, setDynamicXrayTypes] = useState(XRAY_TYPES);
  const [dynamicUltrasoundTypes, setDynamicUltrasoundTypes] = useState(ULTRASOUND_TYPES);

  useEffect(() => {
    let isMounted = true;
    const fetchTypes = async () => {
      try {
        const [xrayRes, usRes] = await Promise.all([
          fetch(buildApiUrl('/api/charges/types/X-Ray')),
          fetch(buildApiUrl('/api/charges/types/Ultrasound')),
        ]);
        if (xrayRes.ok && isMounted) {
          const xrayData = await xrayRes.json();
          if (Array.isArray(xrayData) && xrayData.length > 0) {
            setDynamicXrayTypes(xrayData);
          }
        }
        if (usRes.ok && isMounted) {
          const usData = await usRes.json();
          if (Array.isArray(usData) && usData.length > 0) {
            setDynamicUltrasoundTypes(usData);
          }
        }
      } catch (err) {
        console.error('Failed to fetch dynamic diagnostic types, falling back to static constants:', err);
      }
    };

    fetchTypes();
    return () => {
      isMounted = false;
    };
  }, []);

  const [replacementFile, setReplacementFile] = useState(null);
  const [replacementPreviewUrl, setReplacementPreviewUrl] = useState(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'type') {
        updated.xrayType = '';
        updated.side = 'N/A';
        updated.view = 'N/A';
        updated.ultrasoundType = '';
      }
      return updated;
    });
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

    if (formData.type.trim() === 'X-Ray' && !formData.xrayType.trim()) {
      setToast({ open: true, message: 'Please select an X-Ray Type.', severity: 'error' });
      return;
    }

    if (formData.type.trim() === 'Ultrasound' && !formData.ultrasoundType.trim()) {
      setToast({ open: true, message: 'Please select an Ultrasound Type.', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      const payload = new FormData();
      payload.append('mrNumber', String(mrNum));
      payload.append('type', formData.type.trim());

      if (formData.type.trim() === 'X-Ray') {
        payload.append('xrayType', formData.xrayType);
        payload.append('side', formData.side || 'N/A');
        payload.append('view', formData.view || 'N/A');
      } else if (formData.type.trim() === 'Ultrasound') {
        payload.append('ultrasoundType', formData.ultrasoundType);
      }

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

  // Determine current file type & URL
  const currentFileName = record?.fileName || '';
  const isCurrentImg = /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(currentFileName);
  const isCurrentPdf = /\.pdf$/i.test(currentFileName);
  const currentFileUrl = currentFileName ? buildApiUrl(`document/${currentFileName}`) : null;

  return (
    <div className="add-patient-wrapper">
      <div className="add-patient-layout add-document-layout">
        <form onSubmit={handleSubmit} className="auth-form" style={{ position: 'relative', width: '100%', maxWidth: '440px', boxSizing: 'border-box' }}>
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
          <PatientNameField
            patientName={patientName}
            lookupStatus={patientLookupStatus}
            showLabel={false}
          />

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
                <option value="ECG">ECG</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {formData.type === 'X-Ray' && (
            <>
              <div className="input-group">
                <label className="input-label" htmlFor="xrayType">X-Ray Type</label>
                <div className="input-with-icon">
                  <LocalHospital className="input-icon" />
                  <select
                    id="xrayType"
                    name="xrayType"
                    value={formData.xrayType}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  >
                    <option value="" disabled>Select X-Ray Type</option>
                    {dynamicXrayTypes.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="side">Side</label>
                <div className="input-with-icon">
                  <SwapHoriz className="input-icon" />
                  <select
                    id="side"
                    name="side"
                    value={formData.side}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    {XRAY_SIDES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="view">View</label>
                <div className="input-with-icon">
                  <Visibility className="input-icon" />
                  <select
                    id="view"
                    name="view"
                    value={formData.view}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    {XRAY_VIEWS.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {formData.type === 'Ultrasound' && (
            <div className="input-group">
              <label className="input-label" htmlFor="ultrasoundType">Ultrasound Type</label>
              <div className="input-with-icon">
                <Biotech className="input-icon" />
                <select
                  id="ultrasoundType"
                  name="ultrasoundType"
                  value={formData.ultrasoundType}
                  onChange={handleChange}
                  required
                  disabled={loading}
                >
                  <option value="" disabled>Select Ultrasound Type</option>
                  {dynamicUltrasoundTypes.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

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
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                overflow: 'hidden',
              }}
            >
              {/* Existing File Info */}
              <Box
                onClick={() => currentFileUrl && window.open(currentFileUrl, '_blank', 'noopener,noreferrer')}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  cursor: currentFileUrl ? 'pointer' : 'default',
                  '&:hover': currentFileUrl ? { color: 'var(--primary, hsl(221, 83%, 53%))' } : {},
                }}
                title={currentFileUrl ? "Click to open in new tab" : currentFileName || ''}
              >
                <InsertDriveFileIcon sx={{ color: 'hsl(215, 16%, 47%)', fontSize: 20, flexShrink: 0 }} />
                <Typography
                  variant="body2"
                  sx={{
                    color: 'inherit',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>Current File:</span> {currentFileName || 'No file recorded'}
                </Typography>
                {currentFileUrl && (
                  <OpenInNewIcon sx={{ fontSize: 16, color: 'var(--primary, hsl(221, 83%, 53%))', flexShrink: 0 }} />
                )}
              </Box>

              {/* Replacement File Preview / Upload Trigger */}
              {replacementFile ? (
                <Box
                  sx={{
                    background: 'hsl(0, 0%, 100%)',
                    border: '1px solid hsl(221, 83%, 53%)',
                    borderRadius: '6px',
                    p: 1.25,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5,
                    minWidth: 0,
                    boxSizing: 'border-box',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1, overflow: 'hidden' }}>
                    {replacementFile.type?.startsWith('image/') && replacementPreviewUrl ? (
                      <img
                        src={replacementPreviewUrl}
                        alt="Replacement preview"
                        style={{
                          width: '36px',
                          height: '36px',
                          objectFit: 'cover',
                          borderRadius: '4px',
                          border: '1px solid hsl(214, 32%, 85%)',
                          flexShrink: 0,
                        }}
                      />
                    ) : replacementFile.type === 'application/pdf' ? (
                      <PictureAsPdfIcon sx={{ color: 'hsl(0, 72%, 51%)', fontSize: 28, flexShrink: 0 }} />
                    ) : replacementFile.type?.startsWith('image/') ? (
                      <ImageIcon sx={{ color: 'hsl(217, 91%, 60%)', fontSize: 28, flexShrink: 0 }} />
                    ) : (
                      <InsertDriveFileIcon sx={{ color: 'hsl(215, 16%, 47%)', fontSize: 28, flexShrink: 0 }} />
                    )}

                    <Box sx={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
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
                      <Typography variant="caption" sx={{ color: 'hsl(215, 16%, 47%)', display: 'block' }}>
                        Replacement ({(replacementFile.size / 1024).toFixed(1)} KB)
                      </Typography>
                    </Box>
                  </Box>

                  <Tooltip title="Cancel replacement">
                    <IconButton
                      size="small"
                      onClick={handleRemoveReplacementFile}
                      disabled={loading || isProcessingFile}
                      sx={{ color: 'hsl(0, 72%, 51%)', flexShrink: 0 }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', minWidth: 0 }}>
                  <Button
                    variant="outlined"
                    component="label"
                    size="small"
                    disabled={loading || isProcessingFile}
                    startIcon={<CloudUploadIcon />}
                    sx={{ textTransform: 'none', borderRadius: '6px', flexShrink: 0 }}
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
                  <Typography variant="caption" sx={{ color: 'hsl(215, 16%, 47%)', lineHeight: 1.3, flex: 1, minWidth: '150px' }}>
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

        {/* Large Document Preview Panel (right side) */}
        <div className="document-preview-panel">
          <Typography variant="subtitle2" sx={{
            fontFamily: 'var(--heading), Georgia, serif',
            fontWeight: 700,
            color: 'var(--text-h, hsl(222, 47%, 11%))',
            mb: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            Document Preview {replacementFile ? '(New Replacement)' : '(Current File)'}
          </Typography>

          <Box
            sx={{
              background: 'var(--glass-bg, hsla(0, 0%, 100%, 0.75))',
              border: '1px solid var(--glass-border, hsla(214, 32%, 91%, 0.8))',
              borderRadius: '10px',
              backdropFilter: 'var(--glass-blur, blur(10px))',
              boxShadow: 'var(--shadow, 0 4px 15px hsla(0, 0%, 0%, 0.08))',
              overflow: 'hidden',
              p: 1.5,
            }}
          >
            {replacementFile ? (
              <>
                <Typography
                  variant="caption"
                  onClick={() => replacementPreviewUrl && window.open(replacementPreviewUrl, '_blank', 'noopener,noreferrer')}
                  sx={{ 
                    fontWeight: 600, 
                    color: 'var(--primary, hsl(221, 83%, 53%))', 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    mb: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                  title="Click to open file in new tab"
                >
                  <OpenInNewIcon sx={{ fontSize: 13 }} />
                  {replacementFile.name} ({(replacementFile.size / 1024).toFixed(1)} KB)
                </Typography>

                {replacementFile.type?.startsWith('image/') && replacementPreviewUrl ? (
                  <img
                    src={replacementPreviewUrl}
                    alt={replacementFile.name}
                    onClick={() => window.open(replacementPreviewUrl, '_blank', 'noopener,noreferrer')}
                    title="Click to open in new tab"
                    style={{
                      width: '100%',
                      maxHeight: '65vh',
                      objectFit: 'contain',
                      borderRadius: '6px',
                      border: '1px solid hsl(214, 32%, 91%)',
                      display: 'block',
                      cursor: 'pointer',
                    }}
                  />
                ) : replacementFile.type === 'application/pdf' && replacementPreviewUrl ? (
                  <div
                    onClick={() => window.open(replacementPreviewUrl, '_blank', 'noopener,noreferrer')}
                    style={{ position: 'relative', cursor: 'pointer', width: '100%' }}
                    title="Click to open in new tab"
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 2,
                        background: 'hsl(217, 91%, 60%)',
                        color: '#ffffff',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 6px hsla(0, 0%, 0%, 0.25)',
                        pointerEvents: 'auto',
                      }}
                    >
                      <OpenInNewIcon sx={{ fontSize: 14 }} /> Open in New Tab
                    </div>
                    <iframe
                      src={replacementPreviewUrl}
                      title={replacementFile.name}
                      style={{
                        width: '100%',
                        height: '65vh',
                        borderRadius: '6px',
                        border: '1px solid hsl(214, 32%, 91%)',
                        pointerEvents: 'none',
                      }}
                    />
                  </div>
                ) : (
                  <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 6,
                    color: 'hsl(215, 16%, 47%)',
                  }}>
                    <InsertDriveFileIcon sx={{ fontSize: 48, mb: 1 }} />
                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                      Preview not available for this file type
                    </Typography>
                  </Box>
                )}
              </>
            ) : currentFileName ? (
              <>
                <Typography
                  variant="caption"
                  onClick={() => currentFileUrl && window.open(currentFileUrl, '_blank', 'noopener,noreferrer')}
                  sx={{ 
                    fontWeight: 600, 
                    color: 'var(--text-h, hsl(222, 47%, 11%))', 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    mb: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    cursor: currentFileUrl ? 'pointer' : 'default',
                    '&:hover': currentFileUrl ? { color: 'var(--primary, hsl(221, 83%, 53%))', textDecoration: 'underline' } : {}
                  }}
                  title={currentFileUrl ? "Click to open in new tab" : currentFileName}
                >
                  {currentFileUrl && <OpenInNewIcon sx={{ fontSize: 13 }} />}
                  {currentFileName}
                </Typography>

                {isCurrentImg && currentFileUrl ? (
                  <img
                    src={currentFileUrl}
                    alt={currentFileName}
                    onClick={() => window.open(currentFileUrl, '_blank', 'noopener,noreferrer')}
                    title="Click to open in new tab"
                    style={{
                      width: '100%',
                      maxHeight: '65vh',
                      objectFit: 'contain',
                      borderRadius: '6px',
                      border: '1px solid hsl(214, 32%, 91%)',
                      display: 'block',
                      cursor: 'pointer',
                    }}
                  />
                ) : isCurrentPdf && currentFileUrl ? (
                  <div
                    onClick={() => window.open(currentFileUrl, '_blank', 'noopener,noreferrer')}
                    style={{ position: 'relative', cursor: 'pointer', width: '100%' }}
                    title="Click to open in new tab"
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 2,
                        background: 'hsl(217, 91%, 60%)',
                        color: '#ffffff',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 6px hsla(0, 0%, 0%, 0.25)',
                        pointerEvents: 'auto',
                      }}
                    >
                      <OpenInNewIcon sx={{ fontSize: 14 }} /> Open in New Tab
                    </div>
                    <iframe
                      src={currentFileUrl}
                      title={currentFileName}
                      style={{
                        width: '100%',
                        height: '65vh',
                        borderRadius: '6px',
                        border: '1px solid hsl(214, 32%, 91%)',
                        pointerEvents: 'none',
                      }}
                    />
                  </div>
                ) : (
                  <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 6,
                    color: 'hsl(215, 16%, 47%)',
                  }}>
                    <InsertDriveFileIcon sx={{ fontSize: 48, mb: 1 }} />
                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                      Preview not available for this file type
                    </Typography>
                  </Box>
                )}
              </>
            ) : (
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 6,
                color: 'hsl(215, 16%, 47%)',
              }}>
                <InsertDriveFileIcon sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                  No file recorded for this document
                </Typography>
              </Box>
            )}
          </Box>
        </div>
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
