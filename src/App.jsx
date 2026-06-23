import { useState, useEffect, useCallback } from 'react'
import Login from './pages/LoginPage'
import Dashboard from './components/patients/Dashboard'
import PatientRecords from './components/patients/PatientRecords'
import EditPatient from './components/patients/EditPatient'
import AddPatient from './components/patients/AddPatient'
import AddAppointmentRecord from './components/appointments/AddAppointmentRecord'
import Header from './components/common/Header'
import VitalRecords from './components/vitals/VitalRecords'
import AppointmentRecords from './components/appointments/AppointmentRecords'
import Documents from './components/documents/Documents'
import AddDocument from './components/documents/AddDocument'
import './styles/App.css'
import './styles/Auth.css'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [username, setUsername] = useState('')
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [view, setView] = useState('dashboard') // 'dashboard', 'edit', 'addDocument', 'addPatient', 'addAppointment'
  const [resetKey, setResetKey] = useState(0)
  const [data, setData] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [recordToEdit, setRecordToEdit] = useState(null)
  const [newMrNumber, setNewMrNumber] = useState('')
  const [pendingToast, setPendingToast] = useState('')

  // Fetch all patients once on login; sorting/filtering is handled client-side by MRT.
  // Only re-fetch when the user explicitly searches (debounced).
  useEffect(() => {
    if (!isLoggedIn) return;

    const delayDebounceFn = setTimeout(() => {
      fetch(`/api/patients?search=${encodeURIComponent(searchTerm)}`)
        .then(res => res.json())
        .then(result => {
          if (result && result.data) {
            setData(result.data);
          } else if (Array.isArray(result)) {
            setData(result);
          }
        })
        .catch(console.error);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, isLoggedIn]);

  const handleLogin = useCallback((username) => {
    setUsername(username);
    setIsLoggedIn(true);
  }, []);
  const handleLogout = useCallback(() => {
    setUsername('');
    setIsLoggedIn(false);
  }, []);

  const handleEdit = useCallback((record) => {
    setRecordToEdit(record);
    setView('edit');
  }, []);

  const handleAddDocument = useCallback(() => {
    setView('addDocument');
  }, []);

  const handleBack = useCallback(() => setView('dashboard'), []);
  
  const handleSaveDocument = useCallback(() => {
    setView('dashboard');
  }, []);

  const handleNavigate = useCallback((pageId) => {
    setCurrentPage(pageId);
    setView('dashboard');
    setResetKey(prev => prev + 1);
  }, []);

  const handleSave = useCallback((savedRecord) => {
    setData(prev => prev.map(r => r.id === savedRecord.id ? savedRecord : r));
    setView('dashboard');
  }, []);

  const handleAddPatient = useCallback(() => setView('addPatient'), []);

  const handlePatientAdded = useCallback((newPatient, toastMessage) => {
    setData(prev => [...prev, newPatient]);
    setNewMrNumber(newPatient.mrNumber);
    setPendingToast(toastMessage || '');
    setView('addAppointment');
  }, []);

  const handleAddAppointmentForPatient = useCallback((patient) => {
    setNewMrNumber(patient.mrNumber);
    setPendingToast('');
    setView('addAppointment');
  }, []);

  const handleAppointmentAdded = useCallback(() => {
    setView('dashboard');
    setCurrentPage('appointments');
  }, []);

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

    if (view === 'addPatient') {
      return <AddPatient onBack={handleBack} onAdd={handlePatientAdded} />
    }

    if (view === 'addAppointment') {
      return <AddAppointmentRecord onBack={handleBack} onAdd={handleAppointmentAdded} initialMrNumber={newMrNumber} initialToastMessage={pendingToast} />
    }

    switch (currentPage) {
      case 'vitals':
        return <VitalRecords key={`vitals-${resetKey}`} />;
      case 'appointments':
        return <AppointmentRecords key={`appointments-${resetKey}`} />;
      case 'documents':
        return <Documents key={`documents-${resetKey}`} onAddDocument={handleAddDocument} />;
      case 'patients':
        return (
          <PatientRecords
            key={`patients-${resetKey}`}
            onEdit={handleEdit}
            onAddPatient={handleAddPatient}
            onAddAppointment={handleAddAppointmentForPatient}
            data={data}
            setData={setData}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
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
