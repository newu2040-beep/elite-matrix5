import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DesktopModeProvider } from './context/DesktopModeContext';
import { ToastProvider } from './components/Toast';
import { Home } from './pages/Home';
import { Enhance } from './pages/Enhance';
import { JobProgress } from './pages/JobProgress';
import { ExportResult } from './pages/ExportResult';
import { Projects } from './pages/Projects';
import { Settings } from './pages/Settings';
import { SharedView } from './pages/SharedView';
import { AuthLanding } from './pages/AuthLanding';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/enhance" element={<Enhance />} />
        <Route path="/jobs/:jobId" element={<JobProgress />} />
        <Route path="/exports/:exportId" element={<ExportResult />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/shared/:shareId" element={<SharedView />} />
        <Route path="/auth" element={<AuthLanding />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DesktopModeProvider>
          <ToastProvider>
            <BrowserRouter>
              <AnimatedRoutes />
            </BrowserRouter>
          </ToastProvider>
        </DesktopModeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
