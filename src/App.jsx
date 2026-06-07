import { useState } from 'react'
import Login from './Login'
import Dashboard from './Dashboard'
import './App.css'
import './Auth.css'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  return (
    <>
      {isLoggedIn ? (
        <Dashboard onLogout={() => setIsLoggedIn(false)} />
      ) : (
        <Login onLogin={() => setIsLoggedIn(true)} />
      )}
    </>
  )
}

export default App
