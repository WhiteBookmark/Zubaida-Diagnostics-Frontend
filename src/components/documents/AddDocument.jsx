import { useState, useEffect, useMemo } from 'react';
import { Button, Snackbar, Alert, IconButton, CircularProgress, Box, Typography } from '@mui/material';
import { Badge, Description } from '@mui/icons-material';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ImageIcon from '@mui/icons-material/Image';
import '../../styles/Auth.css';

export default function AddDocument({ onBack, onSave }) {
  const [formData, setFormData] = useState(() => {
    const storedUsername = localStorage.getItem('username') || '';
    let defaultType = '';
    
    if (storedUsername === 'X-Ray Department') defaultType = 'X-Ray';
    else if (storedUsername === 'Ultrasound Department') defaultType = 'Ultrasound';
    else if (storedUsername === 'Lab Department') defaultType = 'Lab Result';

    return {
      mrNumber: '',
      type: defaultType,
    };
  });

  const [files, setFiles] = useState([]);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);

  // Generate preview URLs using useMemo and revoke object URLs on cleanup
  const previews = useMemo(() => {
    return files.map(file => ({
      file,
      url: file.type.startsWith('image/') || file.type === 'application/pdf' ? URL.createObjectURL(file) : null
    }));
  }, [files]);

  useEffect(() => {
    return () => {
      previews.forEach(p => {
        if (p.url) {
          URL.revokeObjectURL(p.url);
        }
      });
    };
  }, [previews]);

  useEffect(() => {
    const handleGlobalPaste = (e) => {
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.isContentEditable)
      ) {
        return;
      }

      const items = e.clipboardData?.items;
      if (items) {
        const pastedFiles = [];
        for (let i = 0; i < items.length; i++) {
          if (items[i].kind === 'file') {
            const pastedFile = items[i].getAsFile();
            if (pastedFile) {
              pastedFiles.push(pastedFile);
            }
          }
        }

        if (pastedFiles.length > 0) {
          setFiles(prev => [...prev, ...pastedFiles]);
          setToast({
            open: true,
            message: `${pastedFiles.length} file(s) pasted from clipboard!`,
            severity: 'success'
          });
          e.preventDefault();
        }
      }
    };

    document.addEventListener('paste', handleGlobalPaste);
    return () => {
      document.removeEventListener('paste', handleGlobalPaste);
    };
  }, []);

  const handlePasteClick = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        setToast({ open: true, message: 'Clipboard API not supported. Please press Ctrl+V.', severity: 'info' });
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      const pastedFiles = [];

      for (const item of clipboardItems) {
        const fileType = item.types.find(t => !t.includes('text/plain') && !t.includes('text/html'));
        if (fileType) {
          const blob = await item.getType(fileType);
          const extension = fileType.split('/')[1]?.split('+')[0] || 'bin';
          const pastedFile = new File([blob], `Pasted-File-${Date.now()}.${extension}`, { type: fileType });
          pastedFiles.push(pastedFile);
        }
      }

      if (pastedFiles.length > 0) {
        setFiles(prev => [...prev, ...pastedFiles]);
        setToast({
          open: true,
          message: `${pastedFiles.length} file(s) pasted from clipboard!`,
          severity: 'success'
        });
      } else {
        setToast({
          open: true,
          message: 'OS-copied files are restricted. Please press Ctrl + V to paste.',
          severity: 'info',
        });
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
      setToast({
        open: true,
        message: 'Clipboard access restricted. Please press Ctrl + V to paste.',
        severity: 'info',
      });
    }
  };

  const handleCloseToast = (event, reason) => {
    if (reason === 'clickaway') return;
    setToast(prev => ({ ...prev, open: false }));
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) {
      setFiles(prev => [...prev, ...selected]);
    }
    // Reset file input value so re-selecting same files triggers onChange
    e.target.value = '';
  };

  const removeFile = (indexToRemove) => {
    setFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedMrNumber = String(formData.mrNumber ?? '').trim();
    const mrNum = parseInt(trimmedMrNumber, 10);

    if (!trimmedMrNumber || !/^\d+$/.test(trimmedMrNumber) || isNaN(mrNum) || mrNum < 1 || mrNum > 2147483647) {
      setToast({ open: true, message: 'Please enter a valid numeric MR Number (1 to 2,147,483,647)', severity: 'error' });
      return;
    }

    if (files.length === 0) {
      setToast({ open: true, message: 'Please select or paste at least one file.', severity: 'error' });
      return;
    }

    const data = new FormData();
    files.forEach(file => {
      data.append('files', file);
    });
    data.append('type', formData.type);

    setLoading(true);
    try {
      const response = await fetch(`/api/documents/${trimmedMrNumber}`, {
        method: 'POST',
        body: data,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload document(s)');
      }

      setToast({ open: true, message: `${files.length} document(s) uploaded successfully!`, severity: 'success' });
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
              {files.length > 0 ? (
                <div style={{ fontWeight: 600, color: 'hsl(222, 47%, 11%)' }}>
                  {files.length} file(s) selected
                </div>
              ) : (
                <>
                  <div style={{ fontWeight: 500 }}>No files selected</div>
                  <div style={{ fontSize: '12px', color: 'hsl(215, 16%, 47%)', marginTop: '4px' }}>
                    Press Ctrl + V repeatedly to paste multiple files here
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                component="label"
                disabled={loading}
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
                  disabled={loading}
                />
              </Button>
              <Button
                variant="outlined"
                onClick={handlePasteClick}
                disabled={loading}
                sx={{ textTransform: 'none' }}
                startIcon={<ContentPasteIcon />}
              >
                Paste Clipboard
              </Button>
            </div>
          </div>
        </div>

        {/* Selected Files List and Previews */}
        {files.length > 0 && (
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
              Selected Files ({files.length}):
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: '300px', overflowY: 'auto', pr: 0.5 }}>
              {previews.map(({ file, url }, index) => (
                <Box
                  key={index}
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
                    {file.type.startsWith('image/') && url ? (
                      <img
                        src={url}
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
                    onClick={() => removeFile(index)}
                    disabled={loading}
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

        {/* Upload and Cancel Buttons */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '16px', width: '100%' }}>
          <Button variant="contained" fullWidth onClick={onBack} disabled={loading}>Cancel</Button>
          <Button variant="contained" fullWidth type="submit" disabled={loading} sx={{ gap: 1 }}>
            {loading ? (
              <>
                <CircularProgress size={20} color="inherit" />
                Uploading...
              </>
            ) : (
              `Upload ${files.length} File(s)`
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

