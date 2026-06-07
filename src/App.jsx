import { useState } from 'react'
import Login from './Login'
import Dashboard from './Dashboard'
import EditPatient from './EditPatient'
import { mockData } from './mockData'
import './App.css'
import './Auth.css'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [view, setView] = useState('dashboard') // 'dashboard' or 'edit'
  const [data, setData] = useState(() => [...mockData])
  const [recordToEdit, setRecordToEdit] = useState(null)

  const renderView = () => {
    if (!isLoggedIn) return <Login onLogin={() => setIsLoggedIn(true)} />
    if (view === 'edit') return (
      <EditPatient
        record={recordToEdit}
        onBack={() => setView('dashboard')}
        onSave={(updatedRecord) => {
          setData(data.map(r => r.mrNumber === updatedRecord.mrNumber ? updatedRecord : r))
          setView('dashboard')
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
