import { useState, useEffect } from 'react'
import Login from './Login'
import Dashboard from './Dashboard'
import EditPatient from './EditPatient'
import { mockData } from './mockData'
import './App.css'
import './Auth.css'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [view, setView] = useState('dashboard') // 'dashboard' or 'edit'
  const [data, setData] = useState([])
  const [recordToEdit, setRecordToEdit] = useState(null)

  useEffect(() => {
    fetch('/api/patients')
      .then(res => res.json())
      .then(result => {
        if (result && result.data) {
          setData(result.data);
        } else if (Array.isArray(result)) {
          setData(result);
        }
      })
      .catch(console.error);
  }, []);

  const renderView = () => {
    if (!isLoggedIn) return <Login onLogin={() => setIsLoggedIn(true)} />
    if (view === 'edit') return (
      <EditPatient
        record={recordToEdit}
        onBack={() => setView('dashboard')}
        onSave={async (updatedRecord) => {
          try {
            const response = await fetch(`/api/patients/${updatedRecord.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...updatedRecord,
                dateOfBirth: updatedRecord.dateOfBirth,
                age: parseInt(updatedRecord.age),
                weight: parseFloat(updatedRecord.weight) || null,
                height: parseFloat(updatedRecord.height) || null,
              })
            });
            if (response.ok) {
              const savedRecord = await response.json();
              setData(data.map(r => r.id === savedRecord.id ? savedRecord : r));
              alert('Patient updated successfully!');
              setView('dashboard');
            } else {
              alert('Failed to update record');
            }
          } catch (err) {
            console.error(err);
            alert('Error updating record');
          }
        }}
      />
    )
    return (
      <Dashboard
        onLogout={() => setIsLoggedIn(false)}
        onEdit={(record) => {
          setRecordToEdit(record)
          setView('edit')
        }}
        data={data}
        setData={setData}
      />
    )
  }

  return (
    <>
      {renderView()}
    </>
  )
}

export default App
