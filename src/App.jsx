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
import PatientFiles from './components/files/PatientFiles'
import useQrScanner from './hooks/useQrScanner'
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
  const [newMrNumber, setNewMrNumber] = useState('')
  const [pendingToast, setPendingToast] = useState('')
  const [pendingAppointmentPrint, setPendingAppointmentPrint] = useState(null)
  const [pendingAppointmentToast, setPendingAppointmentToast] = useState('')
  const [viewToast, setViewToast] = useState('')
  const [isScanProcessing, setIsScanProcessing] = useState(false)

  const clearViewToast = useCallback(() => {
    setViewToast('');
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setUsername('');
    setIsLoggedIn(false);
  }, []);

  const handleLogin = useCallback((username, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
    setUsername(username);
    setIsLoggedIn(true);
    const departmentUsers = ['xray', 'ultrasound', 'lab', 'prescription', 'pft', 'X-Ray Department', 'Ultrasound Department', 'Lab Department', 'PFT Department', 'xr123', 'us123', 'lb123', 'ps123', 'pft123'];
    if (departmentUsers.includes(username)) {
      setCurrentPage('documents');
    }
  }, []);

  useEffect(() => {
    logoutCallback = handleLogout;
    return () => {
      logoutCallback = null;
    };
  }, [handleLogout]);

  const handleEdit = useCallback((record) => {
    setRecordToEdit(record);
    setView('edit');
  }, []);

  const handleAddDocument = useCallback(() => {
    setView('addDocument');
  }, []);

  const handleBack = useCallback(() => setView('dashboard'), []);
  
  const handleSaveDocument = useCallback(() => {
    setViewToast('Document uploaded successfully!');
    setView('dashboard');
    setResetKey(prev => prev + 1);
  }, []);

  const handleNavigate = useCallback((pageId) => {
    setCurrentPage(pageId);
    setView('dashboard');
    setResetKey(prev => prev + 1);
  }, []);

  const handleSave = useCallback(() => {
    setViewToast('Patient updated successfully!');
    setView('dashboard');
    setResetKey(prev => prev + 1);
  }, []);

  const handleAddPatient = useCallback(() => setView('addPatient'), []);

  const handlePatientAdded = useCallback((newPatient, toastMessage) => {
    setNewMrNumber(newPatient.mrNumber);
    setPendingToast(toastMessage || '');
    setView('addAppointment');
    setResetKey(prev => prev + 1);
  }, []);

  const handleAddAppointmentForPatient = useCallback((patient) => {
    setNewMrNumber(patient.mrNumber);
    setPendingToast('');
    setView('addAppointment');
  }, []);

  const handleAppointmentAdded = useCallback((newRecord, message, shouldPrintBrowser = true) => {
    setPendingAppointmentPrint(shouldPrintBrowser ? newRecord : null);
    setPendingAppointmentToast(message);
    setView('dashboard');
    setCurrentPage('appointments');
    setResetKey(prev => prev + 1);
  }, []);

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
          amountPaid: '500',
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
    const isDepartmentUser = ['xray', 'ultrasound', 'lab', 'prescription', 'pft', 'X-Ray Department', 'Ultrasound Department', 'Lab Department', 'PFT Department', 'xr123', 'us123', 'lb123', 'ps123', 'pft123'].includes(username);

    if (isDepartmentUser) {
      if (view === 'addDocument') {
          return <AddDocument key={`addDoc-${resetKey}`} onBack={handleBack} onSave={handleSaveDocument} />
      }
      if (currentPage === 'files' && ['prescription', 'ps123', 'Prescription Department'].includes(username)) {
          return <PatientFiles key={`files-${resetKey}`} />;
      }
      return <DocumentRecords key={`documents-${resetKey}`} onAddDocument={handleAddDocument} initialToastMessage={viewToast} clearPending={clearViewToast} refreshKey={resetKey} />;
    }

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

    if (view === 'addPatient') {
      return <AddPatient onBack={handleBack} onAdd={handlePatientAdded} />
    }

    if (view === 'addAppointment') {
      return <AddAppointmentRecord onBack={handleBack} onAdd={handleAppointmentAdded} initialMrNumber={newMrNumber} initialToastMessage={pendingToast} />
    }

    switch (currentPage) {
      case 'files':
        return <PatientFiles key={`files-${resetKey}`} />;
      case 'appointments':
        return <AppointmentRecords 
                  key={`appointments-${resetKey}`} 
                  initialPrintRecord={pendingAppointmentPrint}
                  initialToastMessage={pendingAppointmentToast}
                  clearPending={handleClearPendingAppointment}
                  refreshKey={resetKey}
               />;
      case 'documents':
        return <DocumentRecords key={`documents-${resetKey}`} onAddDocument={handleAddDocument} initialToastMessage={viewToast} clearPending={clearViewToast} refreshKey={resetKey} />;
      case 'patients':
        return (
          <PatientRecords
            key={`patients-${resetKey}`}
            onEdit={handleEdit}
            onAddPatient={handleAddPatient}
            onAddAppointment={handleAddAppointmentForPatient}
            initialToastMessage={viewToast}
            clearPending={clearViewToast}
            refreshKey={resetKey}
          />
        );
      case 'dashboard':
      default:
        return <Dashboard key={`dashboard-${resetKey}`} />;
    }
  };

  return (
    <>
      <Header currentPage={currentPage} setCurrentPage={handleNavigate} onLogout={handleLogout} username={username} />
      {renderContent()}
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
