import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: { background: '#141425', color: '#eeeef8', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 13, fontWeight: 600 },
            success: { iconTheme: { primary: '#22c55e', secondary: '#141425' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#141425' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
