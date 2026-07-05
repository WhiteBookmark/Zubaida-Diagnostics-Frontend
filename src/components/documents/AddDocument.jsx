import { useState, useEffect } from 'react';
import { Button, Snackbar, Alert } from '@mui/material';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import '../../styles/Auth.css';

export default function AddDocument({ onBack, onSave }) {
  const [formData, setFormData] = useState({
    mrNumber: '',
    type: '',
  });
  const [file, setFile] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

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
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Add New Document</h2>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>MR Number</label>
          <input name="mrNumber" value={formData.mrNumber} onChange={handleChange} required />
        </div>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>Document Type</label>
          <input name="type" value={formData.type} onChange={handleChange} list="document-type-options" required />
          <datalist id="document-type-options">
            <option value="X-Ray" />
            <option value="Ultrasound" />
            <option value="Lab Result" />
            <option value="Prescription" />
          </datalist>
        </div>
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>File</label>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            borderRadius: '8px',
            padding: '8px 12px',
          }}>
            <Button
              variant="contained"
              component="label"
              sx={{ textTransform: 'none' }}
            >
              Choose File
              <input
                type="file"
                hidden
                onChange={handleFileChange}
                required={!file}
              />
            </Button>
            <Button
              variant="outlined"
              onClick={handlePasteClick}
              sx={{ textTransform: 'none' }}
              startIcon={<ContentPasteIcon />}
            >
              Paste
            </Button>
            <span style={{ fontSize: '14px', color: '#0f172a', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {file ? file.name : 'No file selected'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '10px', width: '100%' }}>
          <Button variant="contained" fullWidth onClick={onBack}>Cancel</Button>
          <Button variant="contained" fullWidth type="submit">Upload</Button>
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
