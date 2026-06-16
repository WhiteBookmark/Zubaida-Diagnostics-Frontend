import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Suppress specific React 19 warnings caused by material-react-table internal prop passing to MUI components.
// These are known compatibility issues between MRT v3 and MUI v9/React 19.
const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string') {
    if (
      args[0].includes('React does not recognize the `componentsProps` prop') ||
      args[0].includes('React does not recognize the `MenuListProps` prop') ||
      args[0].includes('React does not recognize the `inputProps` prop') ||
      args[0].includes('React does not recognize the `InputProps` prop')
    ) {
      return;
    }
  }
  originalError(...args);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
