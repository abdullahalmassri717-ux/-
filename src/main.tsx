import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import SharedReportPage from './components/public/SharedReportPage';
import { AuthProvider } from './lib/auth';
import './index.css';
import { listenForInstallPrompt, registerServiceWorker } from './lib/pwa';

listenForInstallPrompt();
registerServiceWorker();

// Parents open their report from a short SMS link: /r/<code>. No sign-in, no app frame.
const reportCode = window.location.pathname.match(/^\/r\/([^/]+)\/?$/)?.[1];

createRoot(document.getElementById('root')!).render(
  reportCode ? (
    <SharedReportPage code={decodeURIComponent(reportCode).toLowerCase()} />
  ) : (
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
  )
);
