import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { AuthProvider } from './lib/auth';
import './index.css';
import { listenForInstallPrompt, registerServiceWorker } from './lib/pwa';

listenForInstallPrompt();
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);
