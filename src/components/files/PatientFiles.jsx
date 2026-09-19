import { useState, useRef, useEffect } from 'react';
import {
  Button,
  IconButton,
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
  MedicalServices,
  Air,
  Close as CloseIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon
} from '@mui/icons-material';
import { buildApiUrl } from '../../config/api';
import { generatePatientDossierPdf } from '../../utils/pdfDossierGenerator';
import '../../styles/Auth.css';

export default function PatientFiles({ initialMrNumber, onBack }) {
  const inputRef = useRef(null);
  const [mrNumber, setMrNumber] = useState(initialMrNumber ? String(initialMrNumber) : '');
  const [selectedTypes, setSelectedTypes] = useState({
    xray: true,
    ultrasound: true,
    prescription: true,
    labReport: true,
    pft: true,
  });

  const [availableTypes, setAvailableTypes] = useState(null); // null = not yet checked
  const [typeCounts, setTypeCounts] = useState({}); // { xray: 3, ultrasound: 1, ... }
  const [isCheckingTypes, setIsCheckingTypes] = useState(false);

  const [loading, setLoading] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });
  const [patientSummary, setPatientSummary] = useState(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const trimmedMr = String(mrNumber || '').trim();
    const parsedMr = parseInt(trimmedMr, 10);
    const isValid = trimmedMr && /^\d+$/.test(trimmedMr) && !isNaN(parsedMr) && parsedMr >= 1 && parsedMr <= 2147483647;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (!isValid) {
        setAvailableTypes(null);
        setTypeCounts({});
        setSelectedTypes({ xray: true, ultrasound: true, prescription: true, labReport: true, pft: true });
        return;
      }

      setIsCheckingTypes(true);
      try {
        const res = await fetch(buildApiUrl(`/api/documents/patient/${parsedMr}/types`), {
          signal: controller.signal
        });
        if (!res.ok) throw new Error('Failed to fetch types');
        const data = await res.json();
        const types = data.types || [];
        const rawCounts = data.typeCounts || {};

        const typeMapping = {
          xray: (t) => t.includes('x-ray') || t.includes('xray'),
          ultrasound: (t) => t.includes('ultrasound') || t.includes('us') || t.includes('ultra'),
          prescription: (t) => t.includes('prescription') || t.includes('ps') || t.includes('rx'),
          labReport: (t) => t.includes('lab') || t.includes('report') || t.includes('result'),
          pft: (t) => t.includes('pft') || t.includes('pulmonary'),
        };

        const newAvailable = {};
        const newSelected = {};
        const newCounts = {};
        for (const [key, matcher] of Object.entries(typeMapping)) {
          let count = 0;
          for (const [rawType, rawCount] of Object.entries(rawCounts)) {
            if (matcher(String(rawType || '').toLowerCase())) {
              count += (typeof rawCount === 'number' ? rawCount : 0);
            }
          }
          if (count === 0 && types.some(t => matcher(String(t || '').toLowerCase()))) {
            count = 1;
          }
          const hasType = count > 0;
          newAvailable[key] = hasType;
          newSelected[key] = hasType;
          newCounts[key] = count;
        }

        setAvailableTypes(newAvailable);
        setSelectedTypes(newSelected);
        setTypeCounts(newCounts);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error checking document types:', err);
          setAvailableTypes(null);
          setTypeCounts({});
        }
      } finally {
        setIsCheckingTypes(false);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [mrNumber]);

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
    if (shouldSelect && availableTypes !== null) {
      setSelectedTypes({
        xray: !!availableTypes.xray,
        ultrasound: !!availableTypes.ultrasound,
        prescription: !!availableTypes.prescription,
        labReport: !!availableTypes.labReport,
        pft: !!availableTypes.pft,
      });
    } else {
      setSelectedTypes({
        xray: shouldSelect,
        ultrasound: shouldSelect,
        prescription: shouldSelect,
        labReport: shouldSelect,
        pft: shouldSelect,
      });
    }
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
        if (selectedTypes.pft && (docType.includes('pft') || docType.includes('pulmonary'))) return true;
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
      <form onSubmit={handleOpenFile} className="auth-form" style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
          <FolderOpen sx={{ fontSize: 32, color: 'hsl(221, 83%, 53%)' }} />
          <h2 style={{ margin: 0, color: 'hsl(222, 47%, 11%)', fontSize: '22px' }}>Patient Files & Dossier</h2>
        </div>

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
            <label className="input-label" style={{ fontFamily: 'Georgia, serif', fontWeight: 600, margin: 0, display: 'inline-flex', alignItems: 'center' }}>
              Document Categories {isCheckingTypes && <CircularProgress size={14} sx={{ ml: 1, color: 'hsl(221, 83%, 53%)' }} />}
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
              padding: '12px 16px',
              background: 'hsl(215, 30%, 97%)',
              border: '1px solid hsl(215, 25%, 85%)',
              borderRadius: '12px',
              width: '100%',
              boxSizing: 'border-box',
              margin: '0 auto'
            }}
          >
            {/* X-Ray Checkbox */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedTypes.xray}
                  onChange={handleCheckboxChange}
                  name="xray"
                  disabled={loading || (availableTypes !== null && !availableTypes.xray)}
                  sx={{
                    color: (availableTypes !== null && !availableTypes.xray) ? 'hsl(215, 16%, 70%)' : 'hsl(221, 83%, 53%)',
                    '&.Mui-checked': { color: 'hsl(221, 83%, 53%)' },
                  }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <MedicalServices sx={{ fontSize: 16, color: (availableTypes !== null && !availableTypes.xray) ? 'hsl(215, 16%, 70%)' : 'hsl(221, 83%, 53%)' }} />
                  <Typography sx={{ fontFamily: 'Georgia, serif', fontWeight: 600, fontSize: '13px', color: (availableTypes !== null && !availableTypes.xray) ? 'hsl(215, 16%, 70%)' : 'hsl(222, 47%, 11%)' }}>
                    X-Ray
                  </Typography>
                  {typeCounts.xray > 0 && (
                    <Box
                      sx={{
                        minWidth: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: 'hsl(221, 83%, 53%)',
                        color: 'hsl(0, 0%, 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        fontFamily: 'Georgia, serif',
                        ml: 0.5,
                      }}
                    >
                      {typeCounts.xray}
                    </Box>
                  )}
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
                  disabled={loading || (availableTypes !== null && !availableTypes.ultrasound)}
                  sx={{
                    color: (availableTypes !== null && !availableTypes.ultrasound) ? 'hsl(215, 16%, 70%)' : 'hsl(221, 83%, 53%)',
                    '&.Mui-checked': { color: 'hsl(221, 83%, 53%)' },
                  }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <LocalHospital sx={{ fontSize: 16, color: (availableTypes !== null && !availableTypes.ultrasound) ? 'hsl(215, 16%, 70%)' : 'hsl(221, 83%, 53%)' }} />
                  <Typography sx={{ fontFamily: 'Georgia, serif', fontWeight: 600, fontSize: '13px', color: (availableTypes !== null && !availableTypes.ultrasound) ? 'hsl(215, 16%, 70%)' : 'hsl(222, 47%, 11%)' }}>
                    Ultrasound
                  </Typography>
                  {typeCounts.ultrasound > 0 && (
                    <Box
                      sx={{
                        minWidth: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: 'hsl(221, 83%, 53%)',
                        color: 'hsl(0, 0%, 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        fontFamily: 'Georgia, serif',
                        ml: 0.5,
                      }}
                    >
                      {typeCounts.ultrasound}
                    </Box>
                  )}
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
                  disabled={loading || (availableTypes !== null && !availableTypes.prescription)}
                  sx={{
                    color: (availableTypes !== null && !availableTypes.prescription) ? 'hsl(215, 16%, 70%)' : 'hsl(221, 83%, 53%)',
                    '&.Mui-checked': { color: 'hsl(221, 83%, 53%)' },
                  }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <DescriptionOutlined sx={{ fontSize: 16, color: (availableTypes !== null && !availableTypes.prescription) ? 'hsl(215, 16%, 70%)' : 'hsl(221, 83%, 53%)' }} />
                  <Typography sx={{ fontFamily: 'Georgia, serif', fontWeight: 600, fontSize: '13px', color: (availableTypes !== null && !availableTypes.prescription) ? 'hsl(215, 16%, 70%)' : 'hsl(222, 47%, 11%)' }}>
                    Prescription
                  </Typography>
                  {typeCounts.prescription > 0 && (
                    <Box
                      sx={{
                        minWidth: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: 'hsl(221, 83%, 53%)',
                        color: 'hsl(0, 0%, 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        fontFamily: 'Georgia, serif',
                        ml: 0.5,
                      }}
                    >
                      {typeCounts.prescription}
                    </Box>
                  )}
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
                  disabled={loading || (availableTypes !== null && !availableTypes.labReport)}
                  sx={{
                    color: (availableTypes !== null && !availableTypes.labReport) ? 'hsl(215, 16%, 70%)' : 'hsl(221, 83%, 53%)',
                    '&.Mui-checked': { color: 'hsl(221, 83%, 53%)' },
                  }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Science sx={{ fontSize: 16, color: (availableTypes !== null && !availableTypes.labReport) ? 'hsl(215, 16%, 70%)' : 'hsl(221, 83%, 53%)' }} />
                  <Typography sx={{ fontFamily: 'Georgia, serif', fontWeight: 600, fontSize: '13px', color: (availableTypes !== null && !availableTypes.labReport) ? 'hsl(215, 16%, 70%)' : 'hsl(222, 47%, 11%)' }}>
                    Lab Report
                  </Typography>
                  {typeCounts.labReport > 0 && (
                    <Box
                      sx={{
                        minWidth: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: 'hsl(221, 83%, 53%)',
                        color: 'hsl(0, 0%, 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        fontFamily: 'Georgia, serif',
                        ml: 0.5,
                      }}
                    >
                      {typeCounts.labReport}
                    </Box>
                  )}
                </Box>
              }
            />

            {/* PFT Checkbox */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedTypes.pft}
                  onChange={handleCheckboxChange}
                  name="pft"
                  disabled={loading || (availableTypes !== null && !availableTypes.pft)}
                  sx={{
                    color: (availableTypes !== null && !availableTypes.pft) ? 'hsl(215, 16%, 70%)' : 'hsl(221, 83%, 53%)',
                    '&.Mui-checked': { color: 'hsl(221, 83%, 53%)' },
                  }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Air sx={{ fontSize: 16, color: (availableTypes !== null && !availableTypes.pft) ? 'hsl(215, 16%, 70%)' : 'hsl(221, 83%, 53%)' }} />
                  <Typography sx={{ fontFamily: 'Georgia, serif', fontWeight: 600, fontSize: '13px', color: (availableTypes !== null && !availableTypes.pft) ? 'hsl(215, 16%, 70%)' : 'hsl(222, 47%, 11%)' }}>
                    PFT
                  </Typography>
                  {typeCounts.pft > 0 && (
                    <Box
                      sx={{
                        minWidth: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: 'hsl(221, 83%, 53%)',
                        color: 'hsl(0, 0%, 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        fontFamily: 'Georgia, serif',
                        ml: 0.5,
                      }}
                    >
                      {typeCounts.pft}
                    </Box>
                  )}
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

      {/* Scroll to top/bottom floating buttons */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px hsla(0, 0%, 0%, 0.15)',
          zIndex: 1000,
        }}
      >
        <IconButton
          onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}
          sx={{
            borderRadius: 0,
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--glass-border)',
            borderBottom: 'none',
            color: 'var(--text)',
            width: 44,
            height: 44,
            '&:hover': { background: 'hsla(0, 0%, 100%, 0.5)' },
          }}
          aria-label="Scroll to top"
        >
          <ArrowUpwardIcon />
        </IconButton>
        <IconButton
          onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })}
          sx={{
            borderRadius: 0,
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text)',
            width: 44,
            height: 44,
            '&:hover': { background: 'hsla(0, 0%, 100%, 0.5)' },
          }}
          aria-label="Scroll to bottom"
        >
          <ArrowDownwardIcon />
        </IconButton>
      </Box>
    </div>
  );
}
