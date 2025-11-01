import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import App from './App.tsx';
import { InterviewPage } from './pages/InterviewPage';
import { InterviewDebug } from './pages/InterviewDebug';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <Router>
        <Routes>
          {/* Debug route - remove after fixing */}
          <Route path="/debug" element={<InterviewDebug />} />
          {/* New token-based interview routes: /i/{sessionToken} */}
          <Route path="/i/:sessionToken" element={<InterviewPage />} />
          {/* Legacy interview routes: /interview/{sessionToken} */}
          <Route path="/interview/:sessionToken" element={<InterviewPage />} />
          {/* Respond subdomain routes: respond.withspeak.com/{project_id}/{stakeholder_id} */}
          <Route path="/:projectId/:stakeholderId" element={<InterviewPage />} />
          <Route path="*" element={<App />} />
        </Routes>
      </Router>
    </ThemeProvider>
  </StrictMode>
);
