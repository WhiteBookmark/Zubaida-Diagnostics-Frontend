import { useState, useEffect, useMemo } from 'react';
import { Button, Snackbar, Alert, IconButton, CircularProgress } from '@mui/material';
import { Badge, Description } from '@mui/icons-material';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import CloseIcon from '@mui/icons-material/Close';
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
  const [file, setFile] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);

  // Generate preview URL using useMemo and revoke object URL on cleanup
  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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
        for (let i = 0; i < items.length; i++) {
          if (items[i].kind === 'file') {
            const pastedFile = items[i].getAsFile();
            if (pastedFile) {
              setFile(pastedFile);
              setToast({ open: true, message: 'File pasted from clipboard!', severity: 'success' });
              e.preventDefault();
              return;
            }
          }
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
      for (const item of clipboardItems) {
        const fileType = item.types.find(t => !t.includes('text/plain') && !t.includes('text/html'));
        if (fileType) {
          const blob = await item.getType(fileType);
          const extension = fileType.split('/')[1]?.split('+')[0] || 'bin';
          const pastedFile = new File([blob], `Pasted-File-${Date.now()}.${extension}`, { type: fileType });
          setFile(pastedFile);
          setToast({ open: true, message: 'File pasted from clipboard!', severity: 'success' });
          return;
        }
      }
      setToast({
        open: true,
        message: 'OS-copied files are restricted. Please press Ctrl + V to paste.',
        severity: 'info',
      });
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
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !formData.mrNumber) {
      setToast({ open: true, message: 'Please enter an MR Number and select a file.', severity: 'error' });
      return;
    }

    const data = new FormData();
    data.append('file', file);
    data.append('type', formData.type);

    setLoading(true);
    try {
      const response = await fetch(`/api/documents/${formData.mrNumber}`, {
        method: 'POST',
        body: data,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload document');
      }

      setToast({ open: true, message: 'Document uploaded successfully!', severity: 'success' });
      onSave(); // Navigate back or refresh
    } catch (error) {
      console.error(error);
      setToast({ open: true, message: 'Error uploading document: ' + error.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Add New Document</h2>
        <div className="input-group">
          <label className="input-label" htmlFor="mrNumber">MR Number</label>
          <div className="input-with-icon">
            <Badge className="input-icon" />
            <input id="mrNumber" name="mrNumber" value={formData.mrNumber} onChange={handleChange} autoFocus required disabled={loading} />
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
          <label className="input-label" htmlFor="file-upload">File</label>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: 'rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            borderRadius: '8px',
            padding: '12px',
            position: 'relative',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {file && (
              <IconButton 
                size="small" 
                onClick={() => setFile(null)} 
                disabled={loading}
                style={{ position: 'absolute', top: '4px', right: '4px', zIndex: 1 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
            
            {/* Updated File Display with Ctrl + V hint */}
            <div style={{ fontSize: '14px', color: '#0f172a', opacity: 0.7, paddingRight: file ? '28px' : '0' }}>
              {file ? (
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                  {file.name}
                </div>
              ) : (
                <>
                  <div>No file selected</div>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                    Press Ctrl + V to paste the file here
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <Button
                variant="contained"
                component="label"
                disabled={loading}
                sx={{ textTransform: 'none' }}
              >
                Choose File
                <input
                  id="file-upload"
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  hidden
                  onChange={handleFileChange}
                  required={!file}
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
                Paste
              </Button>
            </div>
          </div>
        </div>

        {/* Upload and Cancel Buttons */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '10px', width: '100%' }}>
          <Button variant="contained" fullWidth onClick={onBack} disabled={loading}>Cancel</Button>
          <Button variant="contained" fullWidth type="submit" disabled={loading} sx={{ gap: 1 }}>
            {loading ? (
              <>
                <CircularProgress size={20} color="inherit" />
                Uploading...
              </>
            ) : (
              'Upload'
            )}
          </Button>
        </div>

        {/* File Preview Snapshot Box Below Upload & Cancel Buttons */}
        {file && previewUrl && (
          <div style={{
            marginTop: '15px',
            width: '100%',
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            borderRadius: '8px',
            padding: '10px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', marginBottom: '8px', alignSelf: 'flex-start' }}>
              Selected File Preview:
            </div>
            
            {file.type.startsWith('image/') ? (
              <div style={{
                width: '100%',
                maxHeight: '160px',
                overflow: 'hidden',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: '6px',
                background: 'rgba(0,0,0,0.05)'
              }}>
                <img
                  src={previewUrl}
                  alt="Selected preview"
                  style={{ maxWidth: '100%', maxHeight: '160px', objectFit: 'contain', display: 'block' }}
                />
              </div>
            ) : file.type === 'application/pdf' ? (
              /* Interactive, scrollable embedded PDF Viewer */
              <div style={{
                width: '100%',
                height: '450px', // Tall enough to comfortably read and scroll multiple pages
                borderRadius: '6px',
                overflow: 'hidden',
                background: '#fff',
                border: '1px solid rgba(0,0,0,0.15)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                <iframe
                  src={previewUrl} // Standard URL without restricting toolbars or scrollbars
                  title="Interactive PDF Preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    display: 'block'
                  }}
                />
              </div>
            ) : /\.(doc|docx)$/i.test(file.name) || file.type.includes('word') ? (
              /* Word Document visual confirmation card */
              <div style={{ width: '100%', padding: '30px 20px', textAlign: 'center', background: 'rgba(37, 99, 235, 0.1)', border: '1px dashed #2563eb', borderRadius: '8px', color: '#0f172a' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2563eb', marginBottom: '4px' }}>📄 Word Document Selected</div>
                <div style={{ fontSize: '13px', opacity: 0.8 }}>{file.name}</div>
                <div style={{ fontSize: '11px', marginTop: '8px', color: '#64748b' }}>Ready for upload. (Browser inline preview is restricted for Word formats)</div>
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: '#64748b', padding: '20px 0' }}>
                Preview not available for this file format.
              </div>
            )}
          </div>
        )}
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
