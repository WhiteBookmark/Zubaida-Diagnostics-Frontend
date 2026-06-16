import { useState, useEffect, useCallback } from 'react'
import Login from './Login'
import Dashboard from './Dashboard'
import EditPatient from './EditPatient'
import Header from './Header'
import VitalRecords from './VitalRecords'
import AppointmentRecords from './AppointmentRecords'
import Documents from './Documents'
import AddDocument from './AddDocument'
import './App.css'
import './Auth.css'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentPage, setCurrentPage] = useState('patients')
  const [view, setView] = useState('dashboard') // 'dashboard', 'edit', 'addDocument'
  const [data, setData] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [recordToEdit, setRecordToEdit] = useState(null)

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

  const handleLogin = useCallback(() => setIsLoggedIn(true), []);
  const handleLogout = useCallback(() => setIsLoggedIn(false), []);

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

  const handleSave = useCallback(async (updatedRecord) => {
    try {
      const response = await fetch(`/api/patients/${updatedRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updatedRecord,
          dateOfBirth: updatedRecord.dateOfBirth,
          age: parseInt(updatedRecord.age),
        })
      });
      if (response.ok) {
        const savedRecord = await response.json();
        setData(prev => prev.map(r => r.id === savedRecord.id ? savedRecord : r));
        alert('Patient updated successfully!');
        setView('dashboard');
      } else {
        alert('Failed to update record');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating record');
    }
  }, []);

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    if (view === 'edit') {
      return (
        <EditPatient
          record={recordToEdit}
          onBack={handleBack}
          onSave={handleSave}
        />
      );
    }
    
    if (view === 'addDocument') {
        return <AddDocument onBack={handleBack} onSave={handleSaveDocument} />
    }

    switch (currentPage) {
      case 'vitals':
        return <VitalRecords onLogout={handleLogout} />;
      case 'appointments':
        return <AppointmentRecords />;
      case 'documents':
        return <Documents onLogout={handleLogout} onAddDocument={handleAddDocument} />;
      default:
        return (
          <Dashboard
            onLogout={handleLogout}
            onEdit={handleEdit}
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
      <Header currentPage={currentPage} setCurrentPage={setCurrentPage} onLogout={handleLogout} />
      {renderContent()}
    </>
  );
}

export default App
