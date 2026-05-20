import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import ResearchContextProvider from './context/ResearchContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ResearchContextProvider>
        <App />
      </ResearchContextProvider>
    </BrowserRouter>
  </StrictMode>
)
