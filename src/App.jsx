import { useState, useEffect, useCallback } from 'react'
import Login from './Login'
import Dashboard from './Dashboard'
import EditPatient from './EditPatient'
import AddPatient from './AddPatient'
import AddAppointmentRecord from './AddAppointmentRecord'
import Header from './Header'
import VitalRecords from './VitalRecords'
import AppointmentRecords from './AppointmentRecords'
import Documents from './Documents'
import AddDocument from './AddDocument'
import './App.css'
import './Auth.css'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [username, setUsername] = useState('')
  const [currentPage, setCurrentPage] = useState('patients')
  const [view, setView] = useState('dashboard') // 'dashboard', 'edit', 'addDocument', 'addPatient', 'addAppointment'
  const [resetKey, setResetKey] = useState(0)
  const [data, setData] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [recordToEdit, setRecordToEdit] = useState(null)
  const [newMrNumber, setNewMrNumber] = useState('')

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

  const handlePatientAdded = useCallback((newPatient) => {
    setData(prev => [...prev, newPatient]);
    setNewMrNumber(newPatient.mrNumber);
    setView('addAppointment');
  }, []);

  const handleAddAppointmentForPatient = useCallback((patient) => {
    setNewMrNumber(patient.mrNumber);
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
      return <AddAppointmentRecord onBack={handleBack} onAdd={handleAppointmentAdded} initialMrNumber={newMrNumber} />
    }

    switch (currentPage) {
      case 'vitals':
        return <VitalRecords key={`vitals-${resetKey}`} />;
      case 'appointments':
        return <AppointmentRecords key={`appointments-${resetKey}`} />;
      case 'documents':
        return <Documents key={`documents-${resetKey}`} onAddDocument={handleAddDocument} />;
      default:
        return (
          <Dashboard
            key={`dashboard-${resetKey}`}
            onEdit={handleEdit}
            onAddPatient={handleAddPatient}
            onAddAppointment={handleAddAppointmentForPatient}
            data={data}
            setData={setData}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        );
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
