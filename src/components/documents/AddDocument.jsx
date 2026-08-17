import { useState, useEffect, useCallback } from 'react';
import { Button, Snackbar, Alert, IconButton, CircularProgress, Box, Typography, LinearProgress } from '@mui/material';
import { Badge, Description } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ImageIcon from '@mui/icons-material/Image';
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

    return {
      mrNumber: '',
      type: defaultType,
    };
  });

  // Array of { id: string, file: File, previewUrl: string | null }
  const [fileEntries, setFileEntries] = useState([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
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
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
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

    const data = new FormData();
    fileEntries.forEach(entry => {
      data.append('files', entry.file);
    });
    data.append('type', formData.type);

    setLoading(true);
    try {
      const response = await fetch(`/api/documents/${trimmedMrNumber}`, {
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
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
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
            </select>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="file-upload">Files</label>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: 'hsl(215, 30%, 96%)',
            backdropFilter: 'blur(8px)',
            border: '1px dashed hsl(215, 25%, 75%)',
            borderRadius: '8px',
            padding: '16px',
            position: 'relative',
            width: '100%',
            boxSizing: 'border-box'
          }}>
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
                    Press Ctrl + V repeatedly to paste multiple files/scans here
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                component="label"
                disabled={loading || isProcessingFiles}
                sx={{ textTransform: 'none' }}
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
          <Button variant="contained" fullWidth type="submit" disabled={loading || isProcessingFiles} sx={{ gap: 1 }}>
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

