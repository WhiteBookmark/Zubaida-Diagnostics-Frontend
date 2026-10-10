import { useState, useEffect, useCallback, useRef } from 'react'
import { Snackbar, Alert, CircularProgress } from '@mui/material'
import Login from './pages/LoginPage'
import Dashboard from './components/common/Dashboard'
import PatientRecords from './components/patients/PatientRecords'
import EditPatient from './components/patients/EditPatient'
import AddPatient from './components/patients/AddPatient'
import AddAppointmentRecord from './components/appointments/AddAppointmentRecord'
import Header from './components/common/Header'
import AppointmentRecords from './components/appointments/AppointmentRecords'
import DocumentRecords from './components/documents/DocumentRecords'
import AddDocument from './components/documents/AddDocument'
import EditDocument from './components/documents/EditDocument'
import PatientFiles from './components/files/PatientFiles'
import ChargesPage from './components/charges/ChargesPage'
import AddCharge from './components/charges/AddCharge'
import EditCharge from './components/charges/EditCharge'
import DiagnosticOrderRecords from './components/diagnosticOrders/DiagnosticOrderRecords'
import AddDiagnosticOrder from './components/diagnosticOrders/AddDiagnosticOrder'
import EditDiagnosticOrder from './components/diagnosticOrders/EditDiagnosticOrder'
import useQrScanner from './hooks/useQrScanner'
// import VoiceChatPanel from './components/common/VoiceChatPanel'
import ScrollToTopBottom from './components/common/ScrollToTopBottom'
import { createQuickAppointmentAndPrint } from './utils/quickAppointment'
import './styles/App.css'
import './styles/Auth.css'

let logoutCallback = null;

// Initialize global fetch interceptor immediately on file load, preventing mounting race conditions
if (!window.__originalFetch) {
  window.__originalFetch = window.fetch;
  window.fetch = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    if (token) {
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      };
    }
    const response = await window.__originalFetch(url, options);
    if (response.status === 401 && !url.includes('/api/auth/login')) {
      if (logoutCallback) {
        logoutCallback();
      }
    }
    return response;
  };
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('token'))
  const [username, setUsername] = useState(() => localStorage.getItem('username') || '')
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [view, setView] = useState('dashboard') // 'dashboard', 'edit', 'addDocument', 'addPatient', 'addAppointment'
  const [resetKey, setResetKey] = useState(0)
  const [recordToEdit, setRecordToEdit] = useState(null)
  const [documentToEdit, setDocumentToEdit] = useState(null)
  const [newMrNumber, setNewMrNumber] = useState('')
  const [pendingToast, setPendingToast] = useState('')
  const [pendingAppointmentPrint, setPendingAppointmentPrint] = useState(null)
  const [pendingAppointmentToast, setPendingAppointmentToast] = useState('')
  const [viewToast, setViewToast] = useState('')
  const [isScanProcessing, setIsScanProcessing] = useState(false)
  const [filesMrNumber, setFilesMrNumber] = useState(null)
  const [chargeToEdit, setChargeToEdit] = useState(null)
  const [diagnosticOrderToEdit, setDiagnosticOrderToEdit] = useState(null)

  const clearViewToast = useCallback(() => {
    setViewToast('');
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setUsername('');
    setIsLoggedIn(false);
    window.history.replaceState({ page: 'dashboard', view: 'dashboard', _idx: 0 }, '');
  }, []);

  const handleLogin = useCallback((username, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
    setUsername(username);
    setIsLoggedIn(true);
    const departmentUsers = ['xray', 'ultrasound', 'lab', 'prescription', 'pft', 'ecg', 'X-Ray Department', 'Ultrasound Department', 'Lab Department', 'PFT Department', 'ECG Department', 'xr123', 'us123', 'lb123', 'ps123', 'pft123', 'ecg123'];
    const initialPage = departmentUsers.includes(username) ? 'documents' : 'dashboard';
    if (departmentUsers.includes(username)) {
      setCurrentPage('documents');
    }
    window.history.replaceState({ page: initialPage, view: 'dashboard', _idx: 0 }, '');
  }, []);

  useEffect(() => {
    logoutCallback = handleLogout;
    return () => {
      logoutCallback = null;
    };
  }, [handleLogout]);

  // Listen to browser popstate (back/forward button) to restore previous view without exiting the app
  useEffect(() => {
    const handlePopState = (event) => {
      const state = event.state;
      if (state) {
        setCurrentPage(state.page || 'dashboard');
        setView(state.view || 'dashboard');
        if (state.recordToEdit !== undefined) {
          setRecordToEdit(state.recordToEdit);
        }
        if (state.documentToEdit !== undefined) {
          setDocumentToEdit(state.documentToEdit);
        }
        if (state.newMrNumber !== undefined) {
          setNewMrNumber(state.newMrNumber);
        }
        if (state.pendingToast !== undefined) {
          setPendingToast(state.pendingToast);
        }
        if (state.filesMrNumber !== undefined) {
          setFilesMrNumber(state.filesMrNumber);
        } else if (state.page !== 'files') {
          setFilesMrNumber(null);
        }
        if (state.chargeToEdit !== undefined) {
          setChargeToEdit(state.chargeToEdit);
        }
        if (state.diagnosticOrderToEdit !== undefined) {
          setDiagnosticOrderToEdit(state.diagnosticOrderToEdit);
        }
        setResetKey(prev => prev + 1);
      } else {
        setCurrentPage('dashboard');
        setView('dashboard');
        setFilesMrNumber(null);
        setResetKey(prev => prev + 1);
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Push initial state on mount so history navigation has an entry point
    if (!window.history.state) {
      window.history.replaceState({ page: currentPage, view: view, _idx: 0 }, '');
    }

    return () => window.removeEventListener('popstate', handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEdit = useCallback((record) => {
    setRecordToEdit(record);
    setView('edit');
    const nextIdx = (window.history.state?._idx || 0) + 1;
    window.history.pushState({ page: currentPage, view: 'edit', recordToEdit: record, _idx: nextIdx }, '');
  }, [currentPage]);

  const handleAddDocument = useCallback(() => {
    setView('addDocument');
    const nextIdx = (window.history.state?._idx || 0) + 1;
    window.history.pushState({ page: currentPage, view: 'addDocument', _idx: nextIdx }, '');
  }, [currentPage]);

  const handleEditDocument = useCallback((documentRecord) => {
    setDocumentToEdit(documentRecord);
    setView('editDocument');
    const nextIdx = (window.history.state?._idx || 0) + 1;
    window.history.pushState({ page: currentPage, view: 'editDocument', documentToEdit: documentRecord, _idx: nextIdx }, '');
  }, [currentPage]);

  const handleBack = useCallback(() => {
    if (window.history.state && window.history.state._idx > 0) {
      window.history.back();
    } else {
      setView('dashboard');
      if (currentPage === 'files') {
        const isPrescriptionUser = ['prescription', 'ps123', 'Prescription Department'].includes(username);
        setCurrentPage(isPrescriptionUser ? 'documents' : 'dashboard');
      }
      setResetKey(prev => prev + 1);
    }
  }, [currentPage, username]);
  
  const handleSaveDocument = useCallback(() => {
    setViewToast('Document uploaded successfully!');
    setView('dashboard');
    setResetKey(prev => prev + 1);
    const nextIdx = (window.history.state?._idx || 0) + 1;
    window.history.pushState({ page: currentPage, view: 'dashboard', _idx: nextIdx }, '');
  }, [currentPage]);

  const handleSaveEditDocument = useCallback(() => {
    setViewToast('Document updated successfully!');
    setView('dashboard');
    setResetKey(prev => prev + 1);
    const nextIdx = (window.history.state?._idx || 0) + 1;
    window.history.pushState({ page: currentPage, view: 'dashboard', _idx: nextIdx }, '');
  }, [currentPage]);

  const handleViewFiles = useCallback((mrNumber) => {
    setFilesMrNumber(mrNumber);
    setCurrentPage('files');
    setView('dashboard');
    setResetKey(prev => prev + 1);
    const nextIdx = (window.history.state?._idx || 0) + 1;
    window.history.pushState({ page: 'files', view: 'dashboard', filesMrNumber: mrNumber, _idx: nextIdx }, '');
  }, []);

  const handleNavigate = useCallback((pageId) => {
    setCurrentPage(pageId);
    setView('dashboard');
    if (pageId !== 'files') setFilesMrNumber(null);
    setResetKey(prev => prev + 1);
    const nextIdx = (window.history.state?._idx || 0) + 1;
    window.history.pushState({ page: pageId, view: 'dashboard', _idx: nextIdx }, '');
  }, []);

  const handleSave = useCallback(() => {
    setViewToast('Patient updated successfully!');
    setView('dashboard');
    setResetKey(prev => prev + 1);
    const nextIdx = (window.history.state?._idx || 0) + 1;
    window.history.pushState({ page: currentPage, view: 'dashboard', _idx: nextIdx }, '');
  }, [currentPage]);

  const handleAddPatient = useCallback(() => {
    setView('addPatient');
    const nextIdx = (window.history.state?._idx || 0) + 1;
    window.history.pushState({ page: 'patients', view: 'addPatient', _idx: nextIdx }, '');
  }, []);

  const handlePatientAdded = useCallback(async (newPatient, toastMessage) => {
    // 1-Click: Create appointment with current timestamp and trigger thermal print
    const result = await createQuickAppointmentAndPrint(newPatient.mrNumber);
    if (result.success) {
      setPendingAppointmentToast(result.message);
      setView('dashboard');
      setCurrentPage('appointments');
      setResetKey(prev => prev + 1);
      const nextIdx = (window.history.state?._idx || 0) + 1;
      window.history.pushState({ page: 'appointments', view: 'dashboard', _idx: nextIdx }, '');
    } else {
      setViewToast(result.message || toastMessage || 'Failed to print token');
    }
  }, []);

  const handleAddAppointmentForPatient = useCallback(async (patient) => {
    const mr = patient.mrNumber ?? patient;
    const result = await createQuickAppointmentAndPrint(mr);
    if (result.success) {
      setPendingAppointmentToast(result.message);
      setView('dashboard');
      setCurrentPage('appointments');
      setResetKey(prev => prev + 1);
      const nextIdx = (window.history.state?._idx || 0) + 1;
      window.history.pushState({ page: 'appointments', view: 'dashboard', _idx: nextIdx }, '');
    } else {
      setViewToast(result.message || 'Failed to print token');
    }
  }, []);

  const handleNavigateToAppointmentFromSearch = useCallback(async (mrNumber) => {
    const result = await createQuickAppointmentAndPrint(mrNumber);
    if (result.success) {
      setPendingAppointmentToast(result.message);
      setView('dashboard');
      setCurrentPage('appointments');
      setResetKey(prev => prev + 1);
      const nextIdx = (window.history.state?._idx || 0) + 1;
      window.history.pushState({ page: 'appointments', view: 'dashboard', _idx: nextIdx }, '');
    } else {
      setViewToast(result.message || 'Failed to print token');
    }
  }, []);

  // eslint-disable-next-line no-unused-vars
  const handleQrScanResult = useCallback((mrNumber) => {
    if (mrNumber) {
      handleViewFiles(mrNumber);
    }
  }, [handleViewFiles]);

  const handleAppointmentAdded = useCallback((newRecord, message, shouldPrintBrowser = true) => {
    setPendingAppointmentPrint(shouldPrintBrowser ? newRecord : null);
    setPendingAppointmentToast(message);
    setView('dashboard');
    setCurrentPage('appointments');
    setResetKey(prev => prev + 1);
    const nextIdx = (window.history.state?._idx || 0) + 1;
    window.history.pushState({ page: 'appointments', view: 'dashboard', _idx: nextIdx }, '');
  }, []);

  const handleAddCharge = useCallback(() => {
    setView('addCharge');
    const nextIdx = (window.history.state?._idx || 0) + 1;
    window.history.pushState({ page: currentPage, view: 'addCharge', _idx: nextIdx }, '');
  }, [currentPage]);

  const handleEditCharge = useCallback((record) => {
    setChargeToEdit(record);
    setView('editCharge');
    const nextIdx = (window.history.state?._idx || 0) + 1;
    window.history.pushState({ page: currentPage, view: 'editCharge', chargeToEdit: record, _idx: nextIdx }, '');
  }, [currentPage]);

  const handleSaveCharge = useCallback(() => {
    setViewToast('Diagnostic charge saved successfully!');
    setView('dashboard');
    setResetKey(prev => prev + 1);
    const nextIdx = (window.history.state?._idx || 0) + 1;
    window.history.pushState({ page: currentPage, view: 'dashboard', _idx: nextIdx }, '');
  }, [currentPage]);

  const handleAddDiagnosticOrder = useCallback(() => {
    setView('addDiagnosticOrder');
    const nextIdx = (window.history.state?._idx || 0) + 1;
    window.history.pushState({ page: currentPage, view: 'addDiagnosticOrder', _idx: nextIdx }, '');
  }, [currentPage]);

  const handleEditDiagnosticOrder = useCallback((record) => {
    setDiagnosticOrderToEdit(record);
    setView('editDiagnosticOrder');
    const nextIdx = (window.history.state?._idx || 0) + 1;
    window.history.pushState({ page: currentPage, view: 'editDiagnosticOrder', diagnosticOrderToEdit: record, _idx: nextIdx }, '');
  }, [currentPage]);

  const handleSaveDiagnosticOrder = useCallback((savedOrder, toastMsg) => {
    setViewToast(toastMsg || 'Diagnostic order saved successfully!');
    setView('dashboard');
    setResetKey(prev => prev + 1);
    const nextIdx = (window.history.state?._idx || 0) + 1;
    window.history.pushState({ page: currentPage, view: 'dashboard', _idx: nextIdx }, '');
  }, [currentPage]);

  const isScanProcessingRef = useRef(false);

  const handleClearPendingAppointment = useCallback(() => {
    setPendingAppointmentPrint(null);
    setPendingAppointmentToast('');
  }, []);

  /**
   * Zero-click QR scan handler: auto-creates appointment + triggers server thermal print.
   * Called by the useQrScanner hook when a valid patient QR code JSON is detected.
   */
  const handleQrScan = useCallback(async (qrData) => {
    // Prevent duplicate scans while one is already processing
    if (isScanProcessingRef.current) return;
    isScanProcessingRef.current = true;
    setIsScanProcessing(true);

    const mrNumber = String(qrData['MR Number'] || '').trim();
    if (!mrNumber || !/^\d+$/.test(mrNumber)) {
      isScanProcessingRef.current = false;
      setIsScanProcessing(false);
      return;
    }

    // Build current dateTime in the same format as AddAppointmentRecord
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const dateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

    try {
      // Step 1: Create appointment via existing API
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mrNumber: mrNumber,
          dateTime: dateTime,
          amountPaid: '0',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Show error toast and navigate to appointments page
        setPendingAppointmentPrint(null);
        setPendingAppointmentToast(
          `QR Scan failed: ${errorData.error || 'Unknown error'}`
        );
        setView('dashboard');
        setCurrentPage('appointments');
        setResetKey(prev => prev + 1);
        return;
      }

      const newRecord = await response.json();

      // Step 2: Trigger server-side thermal print (never browser print dialog)
      try {
        const printRes = await fetch(`/api/appointments/${newRecord.id}/print`, { method: 'POST' });
        if (!printRes.ok) {
          console.error('Server printing failed after QR scan');
        }
      } catch (pErr) {
        console.error('Error triggering server print after QR scan:', pErr);
      }

      // Step 3: Navigate to appointments page with success toast (no browser print dialog)
      setPendingAppointmentPrint(null);
      setPendingAppointmentToast(
        <span><u>Token is {newRecord.tokenNumber}</u> for MR number {newRecord.patient?.mrNumber || mrNumber} for {newRecord.patient?.name || 'N/A'} (QR Scan — Printed from Server)</span>
      );
      setView('dashboard');
      setCurrentPage('appointments');
      setResetKey(prev => prev + 1);
    } catch (error) {
      console.error('QR scan appointment error:', error);
      setPendingAppointmentPrint(null);
      setPendingAppointmentToast(`QR Scan error: ${error.message}`);
      setView('dashboard');
      setCurrentPage('appointments');
      setResetKey(prev => prev + 1);
      const nextIdx = (window.history.state?._idx || 0) + 1;
      window.history.pushState({ page: 'appointments', view: 'dashboard', _idx: nextIdx }, '');
    } finally {
      isScanProcessingRef.current = false;
      setIsScanProcessing(false);
    }
  }, []);

  // Activate QR scanner hook — enabled only when logged in and not already processing a scan
  useQrScanner(handleQrScan, { enabled: isLoggedIn && !isScanProcessing });

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {

    if (view === 'edit') {
      return (
        <EditPatient
          key={`edit-${resetKey}`}
          record={recordToEdit}
          onBack={handleBack}
          onSave={handleSave}
        />
      );
    }
    
    if (view === 'addDocument') {
        return <AddDocument key={`addDoc-${resetKey}`} onBack={handleBack} onSave={handleSaveDocument} />
    }

    if (view === 'editDocument') {
        return <EditDocument key={`editDoc-${resetKey}`} record={documentToEdit} onBack={handleBack} onSave={handleSaveEditDocument} />
    }

    if (view === 'addPatient') {
      return <AddPatient onBack={handleBack} onAdd={handlePatientAdded} onNavigateToAppointment={handleNavigateToAppointmentFromSearch} />
    }

    if (view === 'addAppointment') {
      return <AddAppointmentRecord onBack={handleBack} onAdd={handleAppointmentAdded} initialMrNumber={newMrNumber} initialToastMessage={pendingToast} />
    }

    if (view === 'addCharge') {
      return <AddCharge key={`addCharge-${resetKey}`} onBack={handleBack} onAdd={handleSaveCharge} />;
    }

    if (view === 'editCharge') {
      return <EditCharge key={`editCharge-${resetKey}`} record={chargeToEdit} onBack={handleBack} onSave={handleSaveCharge} />;
    }

    if (view === 'addDiagnosticOrder') {
      return <AddDiagnosticOrder key={`addDiagOrder-${resetKey}`} onBack={handleBack} onAdd={handleSaveDiagnosticOrder} />;
    }

    if (view === 'editDiagnosticOrder') {
      return <EditDiagnosticOrder key={`editDiagOrder-${resetKey}`} record={diagnosticOrderToEdit} onBack={handleBack} onSave={handleSaveDiagnosticOrder} />;
    }

    switch (currentPage) {
      case 'charges':
      case 'diagnostics':
        return <ChargesPage key={`charges-${resetKey}`} onAddCharge={handleAddCharge} onEditCharge={handleEditCharge} />;
      case 'diagnosticOrders':
        return <DiagnosticOrderRecords 
                  key={`diagnosticOrders-${resetKey}`} 
                  onAddOrder={handleAddDiagnosticOrder}
                  onEditOrder={handleEditDiagnosticOrder}
                  initialToastMessage={viewToast}
                  clearPending={clearViewToast}
                  refreshKey={resetKey}
               />;
      case 'files':
        return <PatientFiles key={`files-${resetKey}`} initialMrNumber={filesMrNumber} onBack={handleBack} />;
      case 'appointments':
        return <AppointmentRecords 
                  key={`appointments-${resetKey}`} 
                  initialPrintRecord={pendingAppointmentPrint}
                  initialToastMessage={pendingAppointmentToast}
                  clearPending={handleClearPendingAppointment}
                  refreshKey={resetKey}
                  onViewFiles={handleViewFiles}
               />;
      case 'documents':
        return <DocumentRecords key={`documents-${resetKey}`} onAddDocument={handleAddDocument} onEditDocument={handleEditDocument} initialToastMessage={viewToast} clearPending={clearViewToast} refreshKey={resetKey} onViewFiles={handleViewFiles} />;
      case 'patients':
        return (
          <PatientRecords
            key={`patients-${resetKey}`}
            onEdit={handleEdit}
            onAddPatient={handleAddPatient}
            onAddAppointment={handleAddAppointmentForPatient}
            onViewFiles={handleViewFiles}
            initialToastMessage={viewToast}
            clearPending={clearViewToast}
            refreshKey={resetKey}
          />
        );
      case 'dashboard':
      default:
        return <Dashboard key={`dashboard-${resetKey}`} onNavigate={handleNavigate} />;
    }
  };

  return (
    <>
      <Header currentPage={currentPage} setCurrentPage={handleNavigate} onLogout={handleLogout} username={username} />
      {renderContent()}
      {/* <VoiceChatPanel username={username} onQrScanResult={handleQrScanResult} /> */}
      <ScrollToTopBottom />
      {isScanProcessing && (
        <Snackbar open anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert severity="info" variant="filled" icon={<CircularProgress size={20} color="inherit" />}>
            Processing QR scan...
          </Alert>
        </Snackbar>
      )}
    </>
  );
}

export default App
