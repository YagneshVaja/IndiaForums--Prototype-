import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css';
import './styles/global.css';
import { DevToolbarProvider } from './contexts/DevToolbarContext';
import { AuthProvider } from './contexts/AuthContext';
import DevToolbar from './components/dev/DevToolbar';
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DevToolbarProvider>
      <AuthProvider>
        <div id="dev-root">
          <DevToolbar />
          <App />
        </div>
      </AuthProvider>
    </DevToolbarProvider>
  </StrictMode>,
)
