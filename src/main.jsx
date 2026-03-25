import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ProjectorWindow from './components/ProjectorWindow.jsx'
import LiveViewer from './components/LiveViewer.jsx'
import './index.css'

// Hard Route Controller
const isProjector = window.location.search.includes('projector=true');
const isLiveView = window.location.search.includes('view=live');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isProjector ? <ProjectorWindow /> : (isLiveView ? <LiveViewer /> : <App />)}
  </StrictMode>,
)

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('SW registration failed: ', err);
    });
  });
}
