import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import SharedReportPage from './components/public/SharedReportPage';
import { AuthProvider } from './lib/auth';
import './index.css';
import { listenForInstallPrompt, registerServiceWorker } from './lib/pwa';
import { listenForErrors, reportError } from './lib/errorLog';

listenForErrors();
listenForInstallPrompt();

// After a new version is published, a screen that was not opened yet may point
// to an old file that no longer exists. Reload once to get the new version.
const RELOAD_KEY = 'daqa.reloadedForUpdate';
setTimeout(() => {
  try {
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    // ignore
  }
}, 15000);
window.addEventListener('vite:preloadError', (event) => {
  const key = RELOAD_KEY;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    return;
  }
  event.preventDefault();
  window.location.reload();
});
registerServiceWorker();

// Parents open their report from a short SMS link: /r/<code>. No sign-in, no app frame.
const reportCode = window.location.pathname.match(/^\/r\/([^/]+)\/?$/)?.[1];

createRoot(document.getElementById('root')!, {
  onUncaughtError: (error, info) => reportError(error, info.componentStack ?? undefined),
  onRecoverableError: (error) => reportError(error, 'recoverable'),
}).render(
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
