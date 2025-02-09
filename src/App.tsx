import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const credentials = useAuthStore((state) => state.credentials);
  return credentials ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  const credentials = useAuthStore((state) => state.credentials);
  const isDark = useThemeStore((state) => state.isDark);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          credentials ? <Navigate to="/dashboard" replace /> : <LoginForm />
        } />
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={
          credentials ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App