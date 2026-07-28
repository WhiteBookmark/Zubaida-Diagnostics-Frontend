import { useState, useEffect, useCallback } from 'react'
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
    const departmentUsers = ['X-Ray Department', 'Ultrasound Department', 'Lab Department'];
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

  const handleAppointmentAdded = useCallback((newRecord, message) => {
    setPendingAppointmentPrint(newRecord);
    setPendingAppointmentToast(message);
    setView('dashboard');
    setCurrentPage('appointments');
    setResetKey(prev => prev + 1);
  }, []);

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    const isDepartmentUser = ['X-Ray Department', 'Ultrasound Department', 'Lab Department'].includes(username);

    if (isDepartmentUser) {
      if (view === 'addDocument') {
          return <AddDocument key={`addDoc-${resetKey}`} onBack={handleBack} onSave={handleSaveDocument} />
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
      case 'appointments':
        return <AppointmentRecords 
                  key={`appointments-${resetKey}`} 
                  initialPrintRecord={pendingAppointmentPrint}
                  initialToastMessage={pendingAppointmentToast}
                  clearPending={() => {
                    setPendingAppointmentPrint(null);
                    setPendingAppointmentToast('');
                  }}
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
    </>
  );
}

export default App
