import { useState, useEffect, useCallback } from 'react';
import { Button, Snackbar, Alert, IconButton, CircularProgress, Box, Typography, LinearProgress } from '@mui/material';
import { Badge, Description, LocalHospital, SwapHoriz, Visibility, Biotech } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ImageIcon from '@mui/icons-material/Image';
import { buildApiUrl } from '../../config/api';
import { XRAY_TYPES, XRAY_SIDES, XRAY_VIEWS, ULTRASOUND_TYPES } from '../../constants/documentTypes';
import usePatientLookup from '../../hooks/usePatientLookup';
import PatientNameField from '../common/PatientNameField';
import '../../styles/Auth.css';

/**
 * Asynchronously compresses and optimizes an image file (e.g. raw scanner bitmap/PNG)
 * to prevent browser memory thrashing and huge network payload freezes.
 * Preserves crisp diagnostic text and stamps while shrinking raw 30MB scans down to ~350KB-600KB.
 *
 * @param {File} file - The file to compress.
 * @returns {Promise<File>} Compressed File or original if not an image.
 */
async function compressImageFile(file) {
  if (!file || typeof file !== 'object') return file;

  // Non-image files (PDF, Word docs) pass through untouched
  const isImage = file.type?.startsWith('image/') || /\.(bmp|png|jpe?g|webp|tiff)$/i.test(file.name || '');
  if (!isImage) return file;

  return new Promise((resolve) => {
    // If file is already small (< 500KB) and is JPEG/WebP, keep as is
    if (file.size < 500 * 1024 && (file.type === 'image/jpeg' || file.type === 'image/webp')) {
      return resolve(file);
    }

    const tempUrl = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      URL.revokeObjectURL(tempUrl);
      try {
        const MAX_DIM = 2200; // Optimal for high-DPI A4 medical scans
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width <= 0 || height <= 0) {
          return resolve(file);
        }

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

        // Fill white background for scans (cleanly handles transparent PNG / BMP conversions)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              // If compressed blob is somehow larger, preserve original
              return resolve(file);
            }

            const baseName = (file.name || `scan-${Date.now()}`).replace(/\.[^/.]+$/, '');
            const optimizedFile = new File([blob], `${baseName}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });

            resolve(optimizedFile);
          },
          'image/jpeg',
          0.88
        );
      } catch (err) {
        console.warn('[AddDocument] Image compression fallback to original:', err);
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

export default function AddDocument({ onBack, onSave }) {
  const [formData, setFormData] = useState(() => {
    const storedUsername = localStorage.getItem('username') || '';
    let defaultType = '';

    if (storedUsername === 'xr123' || storedUsername === 'xray' || storedUsername === 'X-Ray Department') defaultType = 'X-Ray';
    else if (storedUsername === 'us123' || storedUsername === 'ultrasound' || storedUsername === 'Ultrasound Department') defaultType = 'Ultrasound';
    else if (storedUsername === 'lb123' || storedUsername === 'lab' || storedUsername === 'Lab Department') defaultType = 'Lab Result';
    else if (storedUsername === 'ps123' || storedUsername === 'prescription') defaultType = 'Prescription';
    else if (storedUsername === 'pft123' || storedUsername === 'pft' || storedUsername === 'PFT Department') defaultType = 'PFT';
    else if (storedUsername === 'ecg123' || storedUsername === 'ecg' || storedUsername === 'ECG Department') defaultType = 'ECG';

    return {
      mrNumber: '',
      type: defaultType,
      xrayType: '',
      side: 'N/A',
      view: 'N/A',
      ultrasoundType: '',
    };
  });

  const { patientName, lookupStatus: patientLookupStatus } = usePatientLookup(formData.mrNumber);

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

  // Array of { id: string, file: File, previewUrl: string | null }
  const [fileEntries, setFileEntries] = useState([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);

  // Clean up all object URLs when unmounting component
  useEffect(() => {
    return () => {
      fileEntries.forEach(entry => {
        if (entry.previewUrl) {
          try {
            URL.revokeObjectURL(entry.previewUrl);
          } catch {
            // Ignore already revoked URLs
          }
        }
      });
    };
  }, [fileEntries]);

  /**
   * Processes incoming files with asynchronous image compression & safe URL generation.
   */
  const processIncomingFiles = useCallback(async (incomingList) => {
    if (!incomingList || incomingList.length === 0) return;
    setIsProcessingFiles(true);

    try {
      const newEntries = [];
      for (let i = 0; i < incomingList.length; i++) {
        const rawFile = incomingList[i];
        const compressed = await compressImageFile(rawFile);
        const isImgOrPdf = compressed.type?.startsWith('image/') || compressed.type === 'application/pdf';
        const previewUrl = isImgOrPdf ? URL.createObjectURL(compressed) : null;

        newEntries.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${i}`,
          file: compressed,
          previewUrl
        });
      }

      setFileEntries(prev => [...prev, ...newEntries]);
      setToast({
        open: true,
        message: `${incomingList.length} file(s) ready for upload!`,
        severity: 'success'
      });
    } catch (err) {
      console.error('[AddDocument] Error processing files:', err);
      setToast({
        open: true,
        message: 'Error processing selected files.',
        severity: 'error'
      });
    } finally {
      setIsProcessingFiles(false);
    }
  }, []);

  /**
   * Drag and drop handlers for uploading multiple files
   */
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!loading && !isProcessingFiles) {
      setIsDragOver(true);
    }
  }, [loading, isProcessingFiles]);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!loading && !isProcessingFiles) {
      setIsDragOver(true);
    }
  }, [loading, isProcessingFiles]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (loading || isProcessingFiles) return;
    const droppedFiles = Array.from(e.dataTransfer.files || []);
    if (droppedFiles.length > 0) {
      processIncomingFiles(droppedFiles);
    }
  }, [loading, isProcessingFiles, processIncomingFiles]);

  /**
   * Clipboard Paste Listener: Handles scanner clipboard pastes even if an input field is active.
   */
  useEffect(() => {
    const handleGlobalPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;

      const pastedFiles = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          const pastedFile = items[i].getAsFile();
          if (pastedFile) {
            const extension = pastedFile.type.split('/')[1]?.split('+')[0] || 'png';
            const uniqueName = (!pastedFile.name || pastedFile.name === 'image.png')
              ? `Pasted-Scan-${Date.now()}-${i + 1}.${extension}`
              : pastedFile.name;
            const renamedFile = new File([pastedFile], uniqueName, { type: pastedFile.type });
            pastedFiles.push(renamedFile);
          }
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        processIncomingFiles(pastedFiles);
      }
    };

    document.addEventListener('paste', handleGlobalPaste);
    return () => {
      document.removeEventListener('paste', handleGlobalPaste);
    };
  }, [processIncomingFiles]);

  const handleCloseToast = (event, reason) => {
    if (reason === 'clickaway') return;
    setToast(prev => ({ ...prev, open: false }));
  };

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

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) {
      processIncomingFiles(selected);
    }
    // Reset file input value so re-selecting same files triggers onChange
    e.target.value = '';
  };

  const removeFile = (idToRemove) => {
    setFileEntries(prev => {
      const target = prev.find(item => item.id === idToRemove);
      if (target && target.previewUrl) {
        try {
          URL.revokeObjectURL(target.previewUrl);
        } catch {
          // Ignore
        }
      }
      return prev.filter(item => item.id !== idToRemove);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedMrNumber = String(formData.mrNumber ?? '').trim();
    const mrNum = parseInt(trimmedMrNumber, 10);

    if (!trimmedMrNumber || !/^\d+$/.test(trimmedMrNumber) || isNaN(mrNum) || mrNum < 1 || mrNum > 2147483647) {
      setToast({ open: true, message: 'Please enter a valid numeric MR Number (1 to 2,147,483,647)', severity: 'error' });
      return;
    }

    if (fileEntries.length === 0) {
      setToast({ open: true, message: 'Please select or paste at least one file.', severity: 'error' });
      return;
    }

    if (formData.type === 'X-Ray' && !formData.xrayType.trim()) {
      setToast({ open: true, message: 'Please select an X-Ray Type.', severity: 'error' });
      return;
    }

    if (formData.type === 'Ultrasound' && !formData.ultrasoundType.trim()) {
      setToast({ open: true, message: 'Please select an Ultrasound Type.', severity: 'error' });
      return;
    }

    const data = new FormData();
    fileEntries.forEach(entry => {
      data.append('files', entry.file);
    });
    data.append('type', formData.type);

    if (formData.type === 'X-Ray') {
      data.append('xrayType', formData.xrayType);
      data.append('side', formData.side || 'N/A');
      data.append('view', formData.view || 'N/A');
    } else if (formData.type === 'Ultrasound') {
      data.append('ultrasoundType', formData.ultrasoundType);
    }

    setLoading(true);
    try {
      const response = await fetch(buildApiUrl(`/api/documents/${trimmedMrNumber}`), {
        method: 'POST',
        body: data,
      });

      if (!response.ok) {
        let errorMessage = `Server error (${response.status})`;
        if (response.status === 413) {
          errorMessage = 'Uploaded files are too large for the server payload limit. Please upload fewer or smaller files.';
        } else {
          try {
            const rawText = await response.text();
            try {
              const parsed = JSON.parse(rawText);
              errorMessage = parsed.error || parsed.message || errorMessage;
            } catch {
              // Not valid JSON (e.g. Nginx/gateway HTML error page)
              if (rawText && rawText.length < 150 && !rawText.includes('<html')) {
                errorMessage = rawText;
              }
            }
          } catch (readErr) {
            console.error('Failed to read error response:', readErr);
          }
        }
        throw new Error(errorMessage);
      }

      setToast({ open: true, message: `${fileEntries.length} document(s) uploaded successfully!`, severity: 'success' });
      onSave(); // Navigate back or refresh
    } catch (error) {
      console.error(error);
      setToast({ open: true, message: 'Error uploading document(s): ' + error.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-patient-wrapper">
      <div className="add-patient-layout add-document-layout">
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
        <h2>Add New Document(s)</h2>
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
            />
          </div>
        </div>

        {/* Patient Name (Read-Only, Derived from MR Number) */}
        <PatientNameField
          patientName={patientName}
          lookupStatus={patientLookupStatus}
          showLabel={false}
        />

        <div className="input-group">
          <label className="input-label" htmlFor="type">Document Type</label>
          <div className="input-with-icon">
            <Description className="input-icon" />
            <select id="type" name="type" value={formData.type} onChange={handleChange} required disabled={loading}>
              <option value="" disabled>Select Document Type</option>
              <option value="X-Ray">X-Ray</option>
              <option value="Ultrasound">Ultrasound</option>
              <option value="Lab Result">Lab Result</option>
              <option value="Prescription">Prescription</option>
              <option value="PFT">PFT</option>
              <option value="ECG">ECG</option>
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

        <div className="input-group">
          <label className="input-label" htmlFor="file-upload">Files</label>
          <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: isDragOver ? 'hsl(217, 91%, 95%)' : 'hsl(215, 30%, 96%)',
              backdropFilter: 'blur(8px)',
              border: isDragOver
                ? '2px dashed hsl(217, 91%, 60%)'
                : '1px dashed hsl(215, 25%, 75%)',
              borderRadius: '8px',
              padding: '16px',
              position: 'relative',
              width: '100%',
              boxSizing: 'border-box',
              transition: 'background 0.2s ease, border 0.2s ease',
              cursor: isDragOver ? 'copy' : 'default',
            }}
          >
            {isDragOver && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'hsla(217, 91%, 60%, 0.08)',
                borderRadius: '8px',
                zIndex: 5,
                pointerEvents: 'none',
              }}>
                <Typography variant="body2" sx={{
                  fontWeight: 700,
                  color: 'hsl(217, 91%, 50%)',
                  fontSize: '15px',
                }}>
                  Drop files here to upload
                </Typography>
              </div>
            )}
            <div style={{ fontSize: '14px', color: 'hsl(222, 47%, 11%)', textAlign: 'center' }}>
              {isProcessingFiles ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'hsl(222, 47%, 11%)' }}>
                    Optimizing scanned images for high performance...
                  </Typography>
                  <LinearProgress sx={{ width: '80%', borderRadius: 1 }} />
                </Box>
              ) : fileEntries.length > 0 ? (
                <div style={{ fontWeight: 600, color: 'hsl(222, 47%, 11%)' }}>
                  {fileEntries.length} file(s) selected
                </div>
              ) : (
                <>
                  <div style={{ fontWeight: 500 }}>No files selected</div>
                  <div style={{ fontSize: '12px', color: 'hsl(215, 16%, 47%)', marginTop: '4px' }}>
                    Drag & drop files here, or press Ctrl + V to paste scans
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                component="label"
                disabled={loading || isProcessingFiles}
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
                Choose Files
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  hidden
                  onChange={handleFileChange}
                  disabled={loading || isProcessingFiles}
                />
              </Button>
            </div>
          </div>
        </div>

        {/* Selected Files List and Previews */}
        {fileEntries.length > 0 && (
          <Box sx={{
            marginTop: '15px',
            width: '100%',
            background: 'hsl(0, 0%, 100%)',
            border: '1px solid hsl(214, 32%, 91%)',
            borderRadius: '8px',
            padding: '12px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'hsl(222, 47%, 11%)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Selected Files ({fileEntries.length}):
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: '300px', overflowY: 'auto', pr: 0.5 }}>
              {fileEntries.map(({ id, file, previewUrl }) => (
                <Box
                  key={id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5,
                    background: 'hsl(210, 40%, 98%)',
                    border: '1px solid hsl(214, 32%, 91%)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
                    {file.type.startsWith('image/') && previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid hsl(214, 32%, 85%)' }}
                      />
                    ) : file.type === 'application/pdf' ? (
                      <PictureAsPdfIcon sx={{ color: 'hsl(0, 72%, 51%)', fontSize: 32 }} />
                    ) : file.type.startsWith('image/') ? (
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
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {file.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'hsl(215, 16%, 47%)' }}>
                        {(file.size / 1024).toFixed(1)} KB
                      </Typography>
                    </Box>
                  </Box>

                  <IconButton
                    size="small"
                    onClick={() => removeFile(id)}
                    disabled={loading || isProcessingFiles}
                    sx={{ color: 'hsl(0, 72%, 51%)' }}
                    title="Remove file"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Upload Button */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '16px', width: '100%' }}>
          <Button
            variant="contained"
            fullWidth
            type="submit"
            disabled={loading || isProcessingFiles}
            sx={{
              gap: 1,
              background: 'hsl(222, 65%, 32%)',
              color: 'hsl(0, 0%, 100%)',
              fontWeight: 600,
              fontSize: '16px',
              textTransform: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              boxShadow: '0 4px 14px hsla(222, 65%, 32%, 0.35)',
              '&:hover': {
                background: 'hsl(222, 65%, 25%)',
              },
            }}
          >
            {loading ? (
              <>
                <CircularProgress size={20} color="inherit" />
                Saving...
              </>
            ) : (
              `Save ${fileEntries.length} File(s)`
            )}
          </Button>
        </div>
      </form>

      {/* Large Document Preview Panel (right side) */}
      {fileEntries.length > 0 && (
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
            Document Preview ({fileEntries.length})
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {fileEntries.map(({ id, file, previewUrl }) => (
              <Box
                key={id}
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
                <Typography variant="caption" sx={{ 
                  fontWeight: 600, 
                  color: 'var(--text-h, hsl(222, 47%, 11%))', 
                  display: 'block', 
                  mb: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </Typography>

                {file.type?.startsWith('image/') && previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={file.name}
                    style={{
                      width: '100%',
                      maxHeight: '60vh',
                      objectFit: 'contain',
                      borderRadius: '6px',
                      border: '1px solid hsl(214, 32%, 91%)',
                      display: 'block',
                    }}
                  />
                ) : file.type === 'application/pdf' && previewUrl ? (
                  <iframe
                    src={previewUrl}
                    title={file.name}
                    style={{
                      width: '100%',
                      height: '60vh',
                      borderRadius: '6px',
                      border: '1px solid hsl(214, 32%, 91%)',
                    }}
                  />
                ) : (
                  <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 4,
                    color: 'hsl(215, 16%, 47%)',
                  }}>
                    <InsertDriveFileIcon sx={{ fontSize: 48, mb: 1 }} />
                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                      Preview not available for this file type
                    </Typography>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </div>
      )}
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

