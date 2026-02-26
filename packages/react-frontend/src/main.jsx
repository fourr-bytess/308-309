import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
// need to connect this to app.js
import App from './app.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
