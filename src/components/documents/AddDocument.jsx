import { useState, useEffect } from 'react';
import { Button, Snackbar, Alert, IconButton, CircularProgress } from '@mui/material';
import { Badge, Description } from '@mui/icons-material';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import CloseIcon from '@mui/icons-material/Close';
import '../../styles/Auth.css';

export default function AddDocument({ onBack, onSave }) {
  const [formData, setFormData] = useState({
    mrNumber: '',
    type: '',
  });
  const [file, setFile] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);

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
      const response = await fetch(`/api/uploads/${formData.mrNumber}/documents`, {
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
            <input id="mrNumber" name="mrNumber" value={formData.mrNumber} onChange={handleChange} required disabled={loading} />
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
            <div style={{ fontSize: '14px', color: '#0f172a', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: file ? '28px' : '0' }}>
              {file ? file.name : 'No file selected'}
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
