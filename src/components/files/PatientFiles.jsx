import { useState, useRef, useEffect } from 'react';
import {
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  LinearProgress,
  Paper
} from '@mui/material';
import {
  Badge,
  PictureAsPdf,
  FolderOpen,
  CheckCircleOutline,
  DescriptionOutlined,
  LocalHospital,
  Science,
  MedicalServices
} from '@mui/icons-material';
import { buildApiUrl } from '../../config/api';
import { generatePatientDossierPdf } from '../../utils/pdfDossierGenerator';
import '../../styles/Auth.css';

export default function PatientFiles() {
  const inputRef = useRef(null);
  const [mrNumber, setMrNumber] = useState('');
  const [selectedTypes, setSelectedTypes] = useState({
    xray: true,
    ultrasound: true,
    prescription: true,
    labReport: true,
  });

  const [loading, setLoading] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });
  const [patientSummary, setPatientSummary] = useState(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCloseToast = (event, reason) => {
    if (reason === 'clickaway') return;
    setToast(prev => ({ ...prev, open: false }));
  };

  const handleCheckboxChange = (event) => {
    const { name, checked } = event.target;
    setSelectedTypes(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSelectAll = (shouldSelect) => {
    setSelectedTypes({
      xray: shouldSelect,
      ultrasound: shouldSelect,
      prescription: shouldSelect,
      labReport: shouldSelect,
    });
  };

  const isAnyTypeSelected = Object.values(selectedTypes).some(Boolean);

  const handleOpenFile = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const trimmedMr = String(mrNumber || '').trim();
    const parsedMr = parseInt(trimmedMr, 10);

    if (!trimmedMr || !/^\d+$/.test(trimmedMr) || isNaN(parsedMr) || parsedMr < 1 || parsedMr > 2147483647) {
      setToast({
        open: true,
        message: 'Please enter a valid numeric MR Number (1 to 2,147,483,647).',
        severity: 'error'
      });
      inputRef.current?.focus();
      return;
    }

    if (!isAnyTypeSelected) {
      setToast({
        open: true,
        message: 'Please select at least one document type checkbox.',
        severity: 'warning'
      });
      return;
    }

    setLoading(true);
    setProgressPercent(5);
    setProgressStatus('Querying patient records and documents from server...');
    setPatientSummary(null);

    try {
      const response = await fetch(buildApiUrl(`/api/documents/patient/${parsedMr}`));

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`No patient record found with MR Number ${parsedMr}`);
        }
        let errorMsg = `Server error (${response.status})`;
        try {
          const errData = await response.json();
          if (errData?.error || errData?.message) errorMsg = errData.error || errData.message;
        } catch {
          // Ignore JSON parse errors on non-200 responses
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const patient = data.patient;
      const allDocuments = data.documents || [];

      if (!allDocuments || allDocuments.length === 0) {
        setToast({
          open: true,
          message: `Patient ${patient.name || `MR #${parsedMr}`} has no uploaded documents in the database.`,
          severity: 'warning'
        });
        setLoading(false);
        setProgressStatus('');
        return;
      }

      // Filter documents based on selected checkboxes
      const filteredDocuments = allDocuments.filter(doc => {
        const docType = String(doc.type || '').toLowerCase();
        if (selectedTypes.xray && (docType.includes('x-ray') || docType.includes('xray'))) return true;
        if (selectedTypes.ultrasound && (docType.includes('ultrasound') || docType.includes('us') || docType.includes('ultra'))) return true;
        if (selectedTypes.prescription && (docType.includes('prescription') || docType.includes('ps') || docType.includes('rx'))) return true;
        if (selectedTypes.labReport && (docType.includes('lab') || docType.includes('report') || docType.includes('result'))) return true;
        return false;
      });

      if (filteredDocuments.length === 0) {
        setToast({
          open: true,
          message: `Found ${allDocuments.length} document(s) for MR #${parsedMr}, but none matched the selected document categories.`,
          severity: 'warning'
        });
        setLoading(false);
        setProgressStatus('');
        return;
      }

      setPatientSummary({
        patient,
        totalFound: allDocuments.length,
        selectedCount: filteredDocuments.length
      });

      // Generate the unified PDF dossier
      await generatePatientDossierPdf(patient, filteredDocuments, (statusText, percent) => {
        setProgressStatus(statusText);
        setProgressPercent(percent);
      });

      setToast({
        open: true,
        message: `Dossier with ${filteredDocuments.length} document(s) generated and downloaded for ${patient.name || `MR #${parsedMr}`}!`,
        severity: 'success'
      });
    } catch (err) {
      console.error('[PatientFiles] Error processing dossier:', err);
      setToast({
        open: true,
        message: err.message || 'Failed to retrieve or generate patient files.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setProgressStatus('');
      setProgressPercent(0);
    }
  };

  return (
    <div className="auth-container" style={{ maxWidth: '420px', margin: '30px auto', padding: '0 16px' }}>
      <form onSubmit={handleOpenFile} className="auth-form" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
          <FolderOpen sx={{ fontSize: 32, color: 'hsl(221, 83%, 53%)' }} />
          <h2 style={{ margin: 0, color: 'hsl(222, 47%, 11%)', fontSize: '22px' }}>Patient Files & Dossier</h2>
        </div>
        <p style={{ margin: '0 0 18px 0', fontSize: '13px', color: 'hsl(215, 16%, 47%)', textAlign: 'center', lineHeight: '1.4' }}>
          Select document types and enter patient MR Number to compile and download all diagnostic records as a single PDF.
        </p>

        {/* MR Number Input Box (Copied from AddDocument with same attributes & styling) */}
        <div className="input-group">
          <label className="input-label" htmlFor="mrNumber" style={{ fontFamily: 'Georgia, serif', fontWeight: 600 }}>
            MR Number
          </label>
          <div className="input-with-icon">
            <Badge className="input-icon" />
            <input
              ref={inputRef}
              id="mrNumber"
              name="mrNumber"
              type="text"
              inputMode="numeric"
              pattern="[0-9]+"
              min="1"
              max="2147483647"
              placeholder="Enter patient MR Number..."
              value={mrNumber}
              onChange={(e) => setMrNumber(e.target.value)}
              autoFocus
              required
              disabled={loading}
              style={{
                fontFamily: 'Calibri, sans-serif',
                fontSize: '16px'
              }}
            />
          </div>
        </div>

        {/* Checkboxes Section */}
        <div className="input-group" style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label className="input-label" style={{ fontFamily: 'Georgia, serif', fontWeight: 600, margin: 0 }}>
              Document Categories
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleSelectAll(true)}
                disabled={loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'hsl(221, 83%, 53%)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '2px 6px',
                  textDecoration: 'underline'
                }}
              >
                Select All
              </button>
              <span style={{ color: 'hsl(215, 16%, 60%)', fontSize: '12px' }}>|</span>
              <button
                type="button"
                onClick={() => handleSelectAll(false)}
                disabled={loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'hsl(215, 16%, 47%)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '2px 6px',
                  textDecoration: 'underline'
                }}
              >
                Clear All
              </button>
            </div>
          </div>

          <Paper
            elevation={0}
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              padding: '12px',
              background: 'hsl(215, 30%, 97%)',
              border: '1px solid hsl(215, 25%, 85%)',
              borderRadius: '12px',
            }}
          >
            {/* X-Ray Checkbox */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedTypes.xray}
                  onChange={handleCheckboxChange}
                  name="xray"
                  disabled={loading}
                  sx={{
                    color: 'hsl(221, 83%, 53%)',
                    '&.Mui-checked': { color: 'hsl(221, 83%, 53%)' },
                  }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <MedicalServices sx={{ fontSize: 16, color: 'hsl(221, 83%, 53%)' }} />
                  <Typography sx={{ fontFamily: 'Georgia, serif', fontWeight: 600, fontSize: '13px', color: 'hsl(222, 47%, 11%)' }}>
                    X-Ray
                  </Typography>
                </Box>
              }
            />

            {/* Ultrasound Checkbox */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedTypes.ultrasound}
                  onChange={handleCheckboxChange}
                  name="ultrasound"
                  disabled={loading}
                  sx={{
                    color: 'hsl(221, 83%, 53%)',
                    '&.Mui-checked': { color: 'hsl(221, 83%, 53%)' },
                  }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <LocalHospital sx={{ fontSize: 16, color: 'hsl(221, 83%, 53%)' }} />
                  <Typography sx={{ fontFamily: 'Georgia, serif', fontWeight: 600, fontSize: '13px', color: 'hsl(222, 47%, 11%)' }}>
                    Ultrasound
                  </Typography>
                </Box>
              }
            />

            {/* Prescription Checkbox */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedTypes.prescription}
                  onChange={handleCheckboxChange}
                  name="prescription"
                  disabled={loading}
                  sx={{
                    color: 'hsl(221, 83%, 53%)',
                    '&.Mui-checked': { color: 'hsl(221, 83%, 53%)' },
                  }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <DescriptionOutlined sx={{ fontSize: 16, color: 'hsl(221, 83%, 53%)' }} />
                  <Typography sx={{ fontFamily: 'Georgia, serif', fontWeight: 600, fontSize: '13px', color: 'hsl(222, 47%, 11%)' }}>
                    Prescription
                  </Typography>
                </Box>
              }
            />

            {/* Lab Report Checkbox */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedTypes.labReport}
                  onChange={handleCheckboxChange}
                  name="labReport"
                  disabled={loading}
                  sx={{
                    color: 'hsl(221, 83%, 53%)',
                    '&.Mui-checked': { color: 'hsl(221, 83%, 53%)' },
                  }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Science sx={{ fontSize: 16, color: 'hsl(221, 83%, 53%)' }} />
                  <Typography sx={{ fontFamily: 'Georgia, serif', fontWeight: 600, fontSize: '13px', color: 'hsl(222, 47%, 11%)' }}>
                    Lab Report
                  </Typography>
                </Box>
              }
            />
          </Paper>
        </div>

        {/* Live Progress Feedback */}
        {loading && (
          <Box sx={{ width: '100%', mt: 2, p: 2, background: 'hsl(215, 30%, 97%)', borderRadius: 2, border: '1px solid hsl(215, 25%, 85%)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'hsl(222, 47%, 11%)', fontSize: '13px' }}>
                {progressStatus || 'Processing documents...'}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'hsl(221, 83%, 53%)' }}>
                {progressPercent}%
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={progressPercent} sx={{ height: 8, borderRadius: 4 }} />
          </Box>
        )}

        {/* Patient Summary Card if previously fetched */}
        {patientSummary && !loading && (
          <Box sx={{ width: '100%', mt: 2, p: 2, background: 'hsl(142, 76%, 96%)', borderRadius: 2, border: '1px solid hsl(142, 70%, 75%)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'hsl(142, 76%, 25%)' }}>
              <CheckCircleOutline fontSize="small" />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {patientSummary.patient.name || 'Patient'} (MR #{patientSummary.patient.mrNumber})
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'hsl(142, 50%, 30%)', display: 'block', mt: 0.5 }}>
              Compiled {patientSummary.selectedCount} of {patientSummary.totalFound} available document(s) into PDF dossier.
            </Typography>
          </Box>
        )}

        {/* Submit Button */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '20px', width: '100%' }}>
          <Button
            variant="contained"
            fullWidth
            type="submit"
            disabled={loading || !isAnyTypeSelected}
            sx={{
              gap: 1.5,
              py: 1.2,
              fontSize: '16px',
              fontWeight: 700,
              color: '#ffffff !important',
              textTransform: 'none',
              fontFamily: 'Georgia, serif',
              background: 'linear-gradient(135deg, hsl(221, 83%, 53%) 0%, hsl(224, 76%, 45%) 100%)',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
              '&:hover': {
                background: 'linear-gradient(135deg, hsl(221, 83%, 48%) 0%, hsl(224, 76%, 40%) 100%)',
                boxShadow: '0 6px 16px rgba(37, 99, 235, 0.45)',
              }
            }}
          >
            {loading ? (
              <>
                <CircularProgress size={22} sx={{ color: '#ffffff' }} />
                <span style={{ color: '#ffffff', fontWeight: 700 }}>Compiling PDF Dossier...</span>
              </>
            ) : (
              <>
                <PictureAsPdf sx={{ fontSize: 22, color: '#ffffff' }} />
                <span style={{ color: '#ffffff', fontWeight: 700 }}>Open File</span>
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Snackbar Alert Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseToast}
          severity={toast.severity}
          variant="filled"
          sx={{
            width: '100%',
            fontWeight: 500,
            background: toast.severity === 'error'
              ? 'hsl(0, 72%, 40%)'
              : toast.severity === 'success'
                ? 'hsl(142, 70%, 30%)'
                : toast.severity === 'warning'
                  ? 'hsl(38, 92%, 35%)'
                  : 'hsl(221, 83%, 40%)',
            color: 'hsl(0, 0%, 100%)'
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
